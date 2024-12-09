// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

library CommunityLedgerLib {
    enum VoteStatus {
        PENDING,
        VOTING,
        APPROVED,
        REJECTED,
        DELETED,
        EXECUTED
    }

    enum Options {
        EMPTY,
        YES,
        NO,
        ABSTAIN
    }

    enum Category {
        DECISION,
        SPENDING,
        CHANGE_QUOTA,
        CHANGE_MANAGER
    }

    struct Proposal {
        string title;
        string description;
        Category category;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 endDate;
        VoteStatus status;
        uint256 amount;
        address responsible;
    }

    struct Vote {
        address voter;
        uint16 residence;
        Options option;
        uint256 createdAt;
    }

    struct ProposalUpdate {
        bytes32 proposalId;
        string title;
        Category category;
        VoteStatus status;
    }

    struct TransferReceipt {
        address to;
        uint256 amount;
        string proposalTitle;
    }
}
