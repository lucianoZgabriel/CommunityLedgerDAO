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

  it("should add a resident", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    const tx = await adapter.addResident(accounts[1].address, 1201);

    expect(await contract.isResident(accounts[1].address)).to.be.true;
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
    await adapter.addResident(accounts[1].address, 1201);
    const instance = adapter.connect(accounts[1]);
    const tx = await instance.vote("Test Proposal", Options.YES);

    expect(await contract.getVotes("Test Proposal")).to.equal(1);
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
});
