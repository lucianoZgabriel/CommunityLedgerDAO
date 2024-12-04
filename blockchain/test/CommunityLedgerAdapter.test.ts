import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

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
      "This is a test proposal"
    );

    expect(await contract.isProposal("Test Proposal")).to.be.true;
  });

  it("should remove a proposal", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);
    await adapter.createProposal("Test Proposal", "This is a test proposal");

    const tx = await adapter.removeProposal("Test Proposal");

    expect(await contract.isProposal("Test Proposal")).to.be.false;
  });

  it("should open a vote", async function () {
    const { adapter, manager, accounts } = await loadFixture(
      deployAdapterFixture
    );
    const { contract } = await loadFixture(deployImplementationFixture);
    await adapter.setImplementation(contract.target);

    await adapter.createProposal("Test Proposal", "This is a test proposal");
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

    await adapter.createProposal("Test Proposal", "This is a test proposal");
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

    await adapter.createProposal("Test Proposal", "This is a test proposal");
    await adapter.openVote("Test Proposal");
    await adapter.addResident(accounts[1].address, 1201);
    await adapter.vote("Test Proposal", Options.YES);
    await adapter.closeVote("Test Proposal");

    const proposal = await contract.getProposal("Test Proposal");
    expect(proposal.status).to.equal(VoteStatus.APPROVED);
  });
});
