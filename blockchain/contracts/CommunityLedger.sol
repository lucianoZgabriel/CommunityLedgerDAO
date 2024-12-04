// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CommunityLedgerLib as Lib} from "./CommunityLedgerLib.sol";
import {ICommunityLedger} from "./ICommunityLedger.sol";

contract CommunityLedger is ICommunityLedger {
    address public manager;
    mapping(uint16 => bool) public residences;
    mapping(address => uint16) public residents;
    mapping(address => bool) public counselors;

    mapping(bytes32 => Lib.Proposal) public proposals;
    mapping(bytes32 => Lib.Vote[]) public votes;

    constructor() {
        manager = msg.sender;

        for (uint16 i = 1; i <= 24; i++) {
            for (uint8 j = 1; j <= 4; j++) {
                residences[i * 100 + j] = true;
            }
        }
    }

    modifier onlyManager() {
        require(tx.origin == manager, "Only manager can call this function");
        _;
    }

    modifier onlyCouncil() {
        require(
            tx.origin == manager || isCounselor(tx.origin),
            "Only manager or counselor can call this function"
        );
        _;
    }

    modifier onlyResident() {
        require(
            tx.origin == manager || isResident(tx.origin),
            "Only manager or resident can call this function"
        );
        _;
    }

    function isResident(address user) public view returns (bool) {
        return residents[user] > 0;
    }

    function isCounselor(address user) public view returns (bool) {
        return counselors[user];
    }

    function isResidence(uint16 residence) public view returns (bool) {
        return residences[residence];
    }

    function addResident(
        address resident,
        uint16 residence
    ) external onlyCouncil {
        require(isResidence(residence), "Residence does not exist");
        residents[resident] = residence;
    }

    function removeResident(address resident) external onlyManager {
        require(!isCounselor(resident), "Resident is a counselor");
        delete residents[resident];

        if (counselors[resident]) {
            delete counselors[resident];
        }
    }

    function setCounselor(
        address resident,
        bool isEntering
    ) external onlyManager {
        if (isEntering) {
            require(isResident(resident), "The counselor must be a resident");
            counselors[resident] = true;
        } else {
            delete counselors[resident];
        }
    }

    function getProposal(
        string memory title
    ) public view returns (Lib.Proposal memory) {
        bytes32 proposalId = keccak256(bytes(title));
        return proposals[proposalId];
    }

    function isProposal(string memory title) public view returns (bool) {
        return getProposal(title).createdAt > 0;
    }

    function createProposal(
        string memory title,
        string memory description
    ) external onlyResident {
        require(!isProposal(title), "Proposal already exists");

        Lib.Proposal memory newProposal = Lib.Proposal({
            title: title,
            description: description,
            createdAt: block.timestamp,
            updatedAt: 0,
            endDate: 0,
            status: Lib.VoteStatus.PENDING
        });

        bytes32 proposalId = keccak256(bytes(title));
        proposals[proposalId] = newProposal;
    }

    function removeProposal(string memory title) external onlyManager {
        Lib.Proposal memory proposal = getProposal(title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(
            proposal.status == Lib.VoteStatus.PENDING,
            "Only pending proposals can be removed"
        );

        delete proposals[keccak256(bytes(title))];
    }

    function openVote(string memory title) external onlyManager {
        Lib.Proposal memory proposal = getProposal(title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(
            proposal.status == Lib.VoteStatus.PENDING,
            "Proposal is not pending"
        );

        bytes32 proposalId = keccak256(bytes(title));
        proposals[proposalId].status = Lib.VoteStatus.VOTING;
        proposals[proposalId].updatedAt = block.timestamp;
    }

    function vote(
        string memory title,
        Lib.Options option
    ) external onlyResident {
        require(option != Lib.Options.EMPTY, "Option cannot be empty");

        Lib.Proposal memory proposal = getProposal(title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(proposal.status == Lib.VoteStatus.VOTING, "Vote is not open");

        uint16 residence = residents[tx.origin];
        bytes32 proposalId = keccak256(bytes(title));

        Lib.Vote[] memory proposalVotes = votes[proposalId];
        for (uint8 i = 0; i < proposalVotes.length; i++) {
            require(proposalVotes[i].residence != residence, "Already voted");
        }

        Lib.Vote memory newVote = Lib.Vote({
            voter: tx.origin,
            residence: residence,
            option: option,
            createdAt: block.timestamp
        });

        votes[proposalId].push(newVote);
    }

    function closeVote(string memory title) external onlyManager {
        Lib.Proposal memory proposal = getProposal(title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(proposal.status == Lib.VoteStatus.VOTING, "Vote is not open");

        uint8 yesVotes = 0;
        uint8 noVotes = 0;
        uint8 abstainVotes = 0;

        bytes32 proposalId = keccak256(bytes(title));
        Lib.Vote[] memory proposalVotes = votes[proposalId];

        for (uint8 i = 0; i < proposalVotes.length; i++) {
            if (proposalVotes[i].option == Lib.Options.YES) {
                yesVotes++;
            } else if (proposalVotes[i].option == Lib.Options.NO) {
                noVotes++;
            } else if (proposalVotes[i].option == Lib.Options.ABSTAIN) {
                abstainVotes++;
            }
        }

        if (yesVotes > noVotes) {
            proposals[proposalId].status = Lib.VoteStatus.APPROVED;
        } else {
            proposals[proposalId].status = Lib.VoteStatus.REJECTED;
        }

        proposals[proposalId].endDate = block.timestamp;
    }

    function getVotes(string memory title) external view returns (uint256) {
        bytes32 proposalId = keccak256(bytes(title));
        return votes[proposalId].length;
    }
}
