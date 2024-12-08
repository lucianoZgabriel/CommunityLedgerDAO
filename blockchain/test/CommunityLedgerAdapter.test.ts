import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CommunityLedgerAdapter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("CommunityLedgerAdapter", function () {
  enum Options {
    EMPTY = 0,
    YES = 1,
    NO = 2,
    ABSTAIN = 3,
  }

  enum VoteStatus {
    PENDING = 0,
    VOTING = 1,
    APPROVED = 2,
    REJECTED = 3,
    EXECUTED = 4,
  }

  enum Category {
    DECISION,
    SPENDING,
    CHANGE_QUOTA,
    CHANGE_MANAGER,
  }
  async function addResidents(
    adapter: CommunityLedgerAdapter,
    count: number,
    accounts: SignerWithAddress[]
  ) {
    let accountIndex = 1;
    for (let floor = 1; floor <= 24 && accountIndex <= count; floor++) {
      for (let unit = 1; unit <= 4 && accountIndex <= count; unit++) {
        const apartmentNumber = floor * 100 + unit;
        await adapter.addResident(
          accounts[accountIndex].address,
          apartmentNumber
        );
        const instance = adapter.connect(accounts[accountIndex]);
        await instance.payQuota(apartmentNumber, {
          value: ethers.parseEther("0.01"),
        });
        accountIndex++;
      }
    }
  }

  async function addVotes(
    adapter: CommunityLedgerAdapter,
    count: number,
    accounts: SignerWithAddress[]
  ) {
    for (let i = 1; i <= count; i++) {
      const instance = adapter.connect(accounts[i]);
      await instance.vote("Test Proposal", Options.YES);
    }
  }

  async function deployAdapterFixture() {
    const accounts = await ethers.getSigners();
    const manager = accounts[0];

    const CommunityLedgerAdapter = await ethers.getContractFactory(
      "CommunityLedgerAdapter"
    );
    const adapter = await CommunityLedgerAdapter.deploy();

    return { adapter, manager, accounts };
  }

  async function deployImplementationFixture() {
    const CommunityLedger = await ethers.getContractFactory("CommunityLedger");
    const contract = await CommunityLedger.deploy();

    return { contract };
  }

  it("should set the implementation", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);

    await adapter.setImplementation(contract.target);
    const implAddress = await adapter.getImplAddress();

    expect(implAddress).to.equal(contract.target);
  });

  it("should not allow non-manager to set the implementation", async function () {
    const { adapter, accounts } = await loadFixture(deployAdapterFixture);
    const { contract } = await loadFixture(deployImplementationFixture);
    const nonManager = adapter.connect(accounts[1]);

    await expect(
      nonManager.setImplementation(contract.target)
    ).to.be.revertedWith("Only the owner can set the implementation");
  });

  it("should NOT set the implementation to 0 address", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.setImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid implementation address");
  });

  it("should add a resident", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    const tx = await adapter.addResident(accounts[1].address, 1201);

    expect(await contract.isResident(accounts[1].address)).to.be.true;
  });

  it("should NOT add a resident if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.addResident(accounts[1].address, 1201)
    ).to.be.revertedWith("Implementation not set");
  });

  it("should remove a resident", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.addResident(accounts[1].address, 1201);

    const tx = await adapter.removeResident(accounts[1].address);

    expect(await contract.isResident(accounts[1].address)).to.be.false;
  });

  it("should NOT remove a resident if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.removeResident(accounts[1].address)
    ).to.be.revertedWith("Implementation not set");
  });

  it("should set a counselor", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.addResident(accounts[1].address, 1201);
    const tx = await adapter.setCounselor(accounts[1].address, true);

    expect(await contract.isCounselor(accounts[1].address)).to.be.true;
  });

  it("should NOT set a counselor if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.setCounselor(accounts[1].address, true)
    ).to.be.revertedWith("Implementation not set");
  });

  it("should create a proposal", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    const tx = await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      manager.address
    );

    expect(await contract.isProposal("Test Proposal")).to.be.true;
  });

  it("should NOT create a proposal if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.createProposal(
        "Test Proposal",
        "This is a test proposal",
        Category.DECISION,
        0,
        manager.address
      )
    ).to.be.revertedWith("Implementation not set");
  });

  it("should edit a proposal", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.SPENDING,
      0,
      manager.address
    );
    await adapter.editProposal(
      "Test Proposal",
      "This is a test proposal 2",
      10,
      manager.address
    );
    const proposal = await contract.getProposal("Test Proposal");
    expect(proposal.description).to.equal("This is a test proposal 2");
    expect(proposal.amount).to.equal(10);
  });

  it("should NOT edit a proposal if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.editProposal(
        "Test Proposal",
        "This is a test proposal 2",
        10,
        manager.address
      )
    ).to.be.revertedWith("Implementation not set");
  });

  it("should remove a proposal", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);
    await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      manager.address
    );

    const tx = await adapter.removeProposal("Test Proposal");

    expect(await contract.isProposal("Test Proposal")).to.be.false;
  });

  it("should NOT remove a proposal if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(adapter.removeProposal("Test Proposal")).to.be.revertedWith(
      "Implementation not set"
    );
  });

  it("should open a vote", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      manager.address
    );
    const tx = await adapter.openVote("Test Proposal");
    const proposal = await contract.getProposal("Test Proposal");

    expect(proposal.status).to.equal(VoteStatus.VOTING);
  });

  it("should NOT open a vote if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(adapter.openVote("Test Proposal")).to.be.revertedWith(
      "Implementation not set"
    );
  });

  it("should vote", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      manager.address
    );
    await adapter.openVote("Test Proposal");
    await addResidents(adapter, 1, accounts);
    const instance = adapter.connect(accounts[1]);
    const tx = await instance.vote("Test Proposal", Options.YES);

    expect(await contract.getVotes("Test Proposal")).to.equal(1);
  });

  it("should NOT vote if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(adapter.vote("Test Proposal", Options.YES)).to.be.revertedWith(
      "Implementation not set"
    );
  });

  it("should close a vote", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      manager.address
    );
    await adapter.openVote("Test Proposal");
    await addResidents(adapter, 10, accounts);
    await addVotes(adapter, 10, accounts);
    await adapter.closeVote("Test Proposal");

    const proposal = await contract.getProposal("Test Proposal");
    expect(proposal.status).to.equal(VoteStatus.APPROVED);
  });

  it("should NOT close a vote if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(adapter.closeVote("Test Proposal")).to.be.revertedWith(
      "Implementation not set"
    );
  });

  it("should NOT pay the quota if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(
      adapter.payQuota(1201, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Implementation not set");
  });

  it("should transfer", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.SPENDING,
      100,
      accounts[1].address
    );
    await adapter.openVote("Test Proposal");
    await addResidents(adapter, 10, accounts);
    await addVotes(adapter, 10, accounts);
    await adapter.closeVote("Test Proposal");

    const balanceBefore = await ethers.provider.getBalance(contract.target);
    const workerBalanceBefore = await ethers.provider.getBalance(
      accounts[1].address
    );

    const tx = await adapter.transfer("Test Proposal", 100);

    const balanceAfter = await ethers.provider.getBalance(contract.target);
    const workerBalanceAfter = await ethers.provider.getBalance(
      accounts[1].address
    );
    const proposal = await contract.getProposal("Test Proposal");

    expect(balanceAfter).to.equal(balanceBefore - 100n);
    expect(workerBalanceAfter).to.equal(workerBalanceBefore + 100n);
    expect(proposal.status).to.equal(VoteStatus.EXECUTED);
  });

  it("should NOT transfer if implementation is not set", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );

    await expect(adapter.transfer("Test Proposal", 100)).to.be.revertedWith(
      "Implementation not set"
    );
  });
});
