// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CommunityLedgerLib as Lib} from "./CommunityLedgerLib.sol";
import {ICommunityLedger} from "./ICommunityLedger.sol";

contract CommunityLedger is ICommunityLedger {
    address public s_manager;
    uint256 public s_monthlyQuota = 0.01 ether;
    mapping(uint16 => bool) public s_residences;
    mapping(address => uint16) public s_residents;
    mapping(address => bool) public s_counselors;

    mapping(bytes32 => Lib.Proposal) public proposals;
    mapping(bytes32 => Lib.Vote[]) public votes;

    constructor() {
        s_manager = msg.sender;

        for (uint16 i = 1; i <= 24; i++) {
            for (uint8 j = 1; j <= 4; j++) {
                s_residences[i * 100 + j] = true;
            }
        }
    }

    modifier onlyManager() {
        require(tx.origin == s_manager, "Only manager can call this function");
        _;
    }

    modifier onlyCouncil() {
        require(
            tx.origin == s_manager || isCounselor(tx.origin),
            "Only manager or counselor can call this function"
        );
        _;
    }

    modifier onlyResident() {
        require(
            tx.origin == s_manager || isResident(tx.origin),
            "Only manager or resident can call this function"
        );
        _;
    }

    function isResident(address user) public view returns (bool) {
        return s_residents[user] > 0;
    }

    function isCounselor(address user) public view returns (bool) {
        return s_counselors[user];
    }

    function isResidence(uint16 residence) public view returns (bool) {
        return s_residences[residence];
    }

    function addResident(
        address resident,
        uint16 residence
    ) external onlyCouncil {
        require(isResidence(residence), "Residence does not exist");
        s_residents[resident] = residence;
    }

    function removeResident(address resident) external onlyManager {
        require(!isCounselor(resident), "Resident is a counselor");
        delete s_residents[resident];
    }

    function setCounselor(
        address resident,
        bool isEntering
    ) external onlyManager {
        if (isEntering) {
            require(isResident(resident), "The counselor must be a resident");
            s_counselors[resident] = true;
        } else {
            delete s_counselors[resident];
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
        string memory _title,
        string memory _description,
        Lib.Category _category,
        uint256 _amount,
        address _responsible
    ) external onlyResident {
        require(!isProposal(_title), "Proposal already exists");
        if (_amount > 0) {
            require(
                _category == Lib.Category.SPENDING ||
                    _category == Lib.Category.CHANGE_QUOTA,
                "Invalid category"
            );
        }

        Lib.Proposal memory newProposal = Lib.Proposal({
            title: _title,
            description: _description,
            createdAt: block.timestamp,
            updatedAt: 0,
            endDate: 0,
            status: Lib.VoteStatus.PENDING,
            category: _category,
            amount: _amount,
            responsible: _responsible != address(0) ? _responsible : tx.origin
        });

        bytes32 proposalId = keccak256(bytes(_title));
        proposals[proposalId] = newProposal;
    }

    function removeProposal(string memory _title) external onlyManager {
        Lib.Proposal memory proposal = getProposal(_title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(
            proposal.status == Lib.VoteStatus.PENDING,
            "Only pending proposals can be removed"
        );

        delete proposals[keccak256(bytes(_title))];
    }

    function openVote(string memory _title) external onlyManager {
        Lib.Proposal memory proposal = getProposal(_title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(
            proposal.status == Lib.VoteStatus.PENDING,
            "Proposal is not pending"
        );

        bytes32 proposalId = keccak256(bytes(_title));
        proposals[proposalId].status = Lib.VoteStatus.VOTING;
        proposals[proposalId].updatedAt = block.timestamp;
    }

    function vote(
        string memory _title,
        Lib.Options _option
    ) external onlyResident {
        require(_option != Lib.Options.EMPTY, "Option cannot be empty");

        Lib.Proposal memory proposal = getProposal(_title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(proposal.status == Lib.VoteStatus.VOTING, "Vote is not open");

        uint16 residence = s_residents[tx.origin];
        bytes32 proposalId = keccak256(bytes(_title));

        Lib.Vote[] memory proposalVotes = votes[proposalId];
        for (uint8 i = 0; i < proposalVotes.length; i++) {
            require(proposalVotes[i].residence != residence, "Already voted");
        }

        Lib.Vote memory newVote = Lib.Vote({
            voter: tx.origin,
            residence: residence,
            option: _option,
            createdAt: block.timestamp
        });

        votes[proposalId].push(newVote);
    }

    function closeVote(string memory _title) external onlyManager {
        Lib.Proposal memory proposal = getProposal(_title);
        require(proposal.createdAt > 0, "Proposal does not exist");
        require(proposal.status == Lib.VoteStatus.VOTING, "Vote is not open");

        uint8 minVotes = 5;
        uint8 yesVotes = 0;
        uint8 noVotes = 0;
        uint8 abstainVotes = 0;

        if (proposal.category == Lib.Category.SPENDING) {
            minVotes = 10;
        } else if (proposal.category == Lib.Category.CHANGE_MANAGER) {
            minVotes = 15;
        } else if (proposal.category == Lib.Category.CHANGE_QUOTA) {
            minVotes = 19;
        }

        require(getVotes(_title) >= minVotes, "Not enough votes");

        bytes32 proposalId = keccak256(bytes(_title));
        Lib.Vote[] memory proposalVotes = votes[proposalId];

        for (uint8 i = 0; i < proposalVotes.length; i++) {
            if (proposalVotes[i].option == Lib.Options.YES) {
                yesVotes++;
            } else if (proposalVotes[i].option == Lib.Options.NO) {
                noVotes++;
            } else {
                abstainVotes++;
            }
        }

        Lib.VoteStatus newStatus = yesVotes > noVotes
            ? Lib.VoteStatus.APPROVED
            : Lib.VoteStatus.REJECTED;

        proposals[proposalId].status = newStatus;
        proposals[proposalId].endDate = block.timestamp;

        if (newStatus == Lib.VoteStatus.APPROVED) {
            if (proposal.category == Lib.Category.CHANGE_QUOTA) {
                s_monthlyQuota = proposal.amount;
            } else if (proposal.category == Lib.Category.CHANGE_MANAGER) {
                s_manager = proposal.responsible;
            }
        }
    }

    function getVotes(string memory _title) public view returns (uint256) {
        bytes32 proposalId = keccak256(bytes(_title));
        return votes[proposalId].length;
    }
}
