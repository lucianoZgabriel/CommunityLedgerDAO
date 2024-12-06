import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CommunityLedger } from "../typechain-types";

describe("CommunityLedger", function () {
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
    contract: CommunityLedger,
    count: number,
    accounts: SignerWithAddress[]
  ) {
    const maxResidents = Math.min(count, accounts.length - 1);
    let accountIndex = 1;
    for (let floor = 1; floor <= 24 && accountIndex <= maxResidents; floor++) {
      for (let unit = 1; unit <= 4 && accountIndex <= maxResidents; unit++) {
        const apartmentNumber = floor * 100 + unit;
        await contract.addResident(
          accounts[accountIndex].address,
          apartmentNumber
        );
        accountIndex++;
      }
    }
  }

  async function addVotes(
    contract: CommunityLedger,
    count: number,
    accounts: SignerWithAddress[],
    shouldApprove: boolean = true
  ) {
    const maxVoters = Math.min(count, accounts.length - 1);

    for (let i = 1; i <= maxVoters; i++) {
      const connectedContract = contract.connect(accounts[i]);
      await connectedContract.vote(
        "Test Proposal",
        shouldApprove ? Options.YES : Options.NO
      );
    }
  }

  async function deployContract() {
    const accounts = await ethers.getSigners();
    const manager = accounts[0];
    const resident = accounts[1];
    const CommunityLedger = await ethers.getContractFactory("CommunityLedger");
    const communityLedger = await CommunityLedger.deploy();
    return { communityLedger, accounts, manager, resident };
  }

  it("should set the residences correctly", async function () {
    const { communityLedger } = await loadFixture(deployContract);
    expect(await communityLedger.isResidence(1201)).to.equal(true);
  });

  it("should set the residents correctly", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    expect(await communityLedger.isResident(resident.address)).to.equal(true);
  });

  it("should NOT set the residents correctly if not manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    const instance = communityLedger.connect(resident);
    await expect(
      instance.addResident(resident.address, 1201)
    ).to.be.revertedWith("Only manager or counselor can call this function");
  });

  it("should NOT set the residents correctly if not residence", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await expect(
      communityLedger.addResident(resident.address, 1205)
    ).to.be.revertedWith("Residence does not exist");
  });

  it("should remove the residents correctly", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.removeResident(resident.address);
    expect(await communityLedger.isResident(resident.address)).to.equal(false);
  });

  it("should NOT remove the residents correctly if not manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    const instance = communityLedger.connect(resident);
    await expect(instance.removeResident(resident.address)).to.be.revertedWith(
      "Only manager can call this function"
    );
  });

  it("should NOT remove residents that are counselors", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.setCounselor(resident.address, true);
    await expect(
      communityLedger.removeResident(resident.address)
    ).to.be.revertedWith("Resident is a counselor");
  });

  it("should set the counselors correctly", async function () {
    const { communityLedger, resident, accounts } = await loadFixture(
      deployContract
    );
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.setCounselor(resident.address, true);
    const instance = communityLedger.connect(resident);
    await instance.addResident(accounts[2].address, 1202);
    expect(await communityLedger.isCounselor(resident.address)).to.equal(true);
    expect(await communityLedger.isResident(accounts[2].address)).to.equal(
      true
    );
  });

  it("should remove the counselors correctly", async function () {
    const { communityLedger, resident, accounts } = await loadFixture(
      deployContract
    );
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.setCounselor(resident.address, true);
    await communityLedger.setCounselor(resident.address, false);
    expect(await communityLedger.isCounselor(resident.address)).to.equal(false);
  });

  it("should NOT set the counselors correctly if not manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    const instance = communityLedger.connect(resident);
    await expect(
      instance.setCounselor(resident.address, true)
    ).to.be.revertedWith("Only manager can call this function");
  });

  it("should NOT set the counselors correctly if not resident", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await expect(
      communityLedger.setCounselor(resident.address, true)
    ).to.be.revertedWith("The counselor must be a resident");
  });

  it("should change the manager correctly", async function () {
    const { communityLedger, accounts, resident } = await loadFixture(
      deployContract
    );
    await addResidents(communityLedger, 15, accounts);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.CHANGE_MANAGER,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");

    await addVotes(communityLedger, 15, accounts);
    await communityLedger.closeVote("Test Proposal");

    expect(await communityLedger.s_manager()).to.equal(resident.address);
  });

  it("should change the quota correctly", async function () {
    const { communityLedger, accounts, resident } = await loadFixture(
      deployContract
    );
    const quota = ethers.parseEther("0.02");
    await addResidents(communityLedger, 20, accounts);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.CHANGE_QUOTA,
      quota,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");

    await addVotes(communityLedger, 20, accounts);
    await communityLedger.closeVote("Test Proposal");

    expect(await communityLedger.s_monthlyQuota()).to.equal(quota);
  });

  it("should create a proposal correctly if manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    expect(await communityLedger.isProposal("Test Proposal")).to.equal(true);
  });

  it("should create a proposal correctly if resident", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    const instance = communityLedger.connect(resident);
    await instance.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    expect(await communityLedger.isProposal("Test Proposal")).to.equal(true);
  });

  it("should NOT create a proposal if the category is wrong (amount is not 0)", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await expect(
      communityLedger.createProposal(
        "Test Proposal",
        "This is a test proposal",
        Category.DECISION,
        10,
        resident.address
      )
    ).to.be.revertedWith("Invalid category");
  });

  it("should NOT create a proposal if not resident", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    const instance = communityLedger.connect(resident);
    await expect(
      instance.createProposal(
        "Test Proposal",
        "This is a test proposal",
        Category.DECISION,
        0,
        resident.address
      )
    ).to.be.revertedWith("Only manager or resident can call this function");
  });

  it("should NOT create a proposal if already exists", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await expect(
      communityLedger.createProposal(
        "Test Proposal",
        "This is a test proposal",
        Category.DECISION,
        0,
        resident.address
      )
    ).to.be.revertedWith("Proposal already exists");
  });

  it("should remove a proposal correctly", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.removeProposal("Test Proposal");
    expect(await communityLedger.isProposal("Test Proposal")).to.equal(false);
  });

  it("should NOT remove a proposal if not manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    const instance = communityLedger.connect(resident);
    await expect(instance.removeProposal("Test Proposal")).to.be.revertedWith(
      "Only manager can call this function"
    );
  });

  it("should NOT remove a proposal if not exists", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await expect(
      communityLedger.removeProposal("Test Proposal")
    ).to.be.revertedWith("Proposal does not exist");
  });

  it("should NOT remove a proposal if not pending", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    await expect(
      communityLedger.removeProposal("Test Proposal")
    ).to.be.revertedWith("Only pending proposals can be removed");
  });

  it("should NOT open a vote if not manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    const instance = communityLedger.connect(resident);
    await expect(instance.openVote("Test Proposal")).to.be.revertedWith(
      "Only manager can call this function"
    );
  });

  it("should NOT open a vote if proposal is not pending", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    await expect(communityLedger.openVote("Test Proposal")).to.be.revertedWith(
      "Proposal is not pending"
    );
  });

  it("should NOT open a vote if proposal does not exist", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await expect(communityLedger.openVote("Test Proposal")).to.be.revertedWith(
      "Proposal does not exist"
    );
  });

  it("should vote correctly", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    const instance = communityLedger.connect(resident);
    await instance.vote("Test Proposal", Options.ABSTAIN);
    expect(await communityLedger.getVotes("Test Proposal")).to.equal(1);
  });

  it("should NOT vote again if already voted", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    const instance = communityLedger.connect(resident);
    await instance.vote("Test Proposal", Options.YES);
    await expect(
      instance.vote("Test Proposal", Options.YES)
    ).to.be.revertedWith("Already voted");
  });

  it("should NOT vote if it is not open", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    const instance = communityLedger.connect(resident);
    await expect(
      instance.vote("Test Proposal", Options.YES)
    ).to.be.revertedWith("Vote is not open");
  });

  it("should NOT vote if it does not exist", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    const instance = communityLedger.connect(resident);
    await expect(
      instance.vote("Test Proposal", Options.YES)
    ).to.be.revertedWith("Proposal does not exist");
  });

  it("should NOT vote if it is not resident", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    const instance = communityLedger.connect(resident);
    await expect(
      instance.vote("Test Proposal", Options.YES)
    ).to.be.revertedWith("Only manager or resident can call this function");
  });

  it("should NOT vote if option is empty", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    const instance = communityLedger.connect(resident);
    await expect(
      instance.vote("Test Proposal", Options.EMPTY)
    ).to.be.revertedWith("Option cannot be empty");
  });

  it("should close the vote correctly", async function () {
    const { communityLedger, accounts, resident } = await loadFixture(
      deployContract
    );
    await addResidents(communityLedger, 11, accounts);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    await addVotes(communityLedger, 10, accounts, false);
    await communityLedger
      .connect(accounts[11])
      .vote("Test Proposal", Options.ABSTAIN);
    await communityLedger.closeVote("Test Proposal");

    const proposal = await communityLedger.getProposal("Test Proposal");
    expect(proposal.status).to.equal(VoteStatus.REJECTED);
  });

  it("should NOT close the vote if not enough votes", async function () {
    const { communityLedger, accounts, resident } = await loadFixture(
      deployContract
    );
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    await expect(communityLedger.closeVote("Test Proposal")).to.be.revertedWith(
      "Not enough votes"
    );
  });

  it("should NOT close the vote if not manager", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.addResident(resident.address, 1201);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await communityLedger.openVote("Test Proposal");
    const instance = communityLedger.connect(resident);
    await expect(instance.closeVote("Test Proposal")).to.be.revertedWith(
      "Only manager can call this function"
    );
  });

  it("should NOT close if proposal does not exist", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await expect(communityLedger.closeVote("Test Proposal")).to.be.revertedWith(
      "Proposal does not exist"
    );
  });

  it("should NOT close if proposal is not voting", async function () {
    const { communityLedger, resident } = await loadFixture(deployContract);
    await communityLedger.createProposal(
      "Test Proposal",
      "This is a test proposal",
      Category.DECISION,
      0,
      resident.address
    );
    await expect(communityLedger.closeVote("Test Proposal")).to.be.revertedWith(
      "Vote is not open"
    );
  });
});
