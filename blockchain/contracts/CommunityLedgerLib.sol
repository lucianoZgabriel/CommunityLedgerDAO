// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

library CommunityLedgerLib {
    enum VoteStatus {
        PENDING,
        VOTING,
        APPROVED,
        REJECTED
    }

    enum Options {
        EMPTY,
        YES,
        NO,
        ABSTAIN
    }

    struct Proposal {
        string title;
        string description;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 endDate;
        VoteStatus status;
    }

    struct Vote {
        address voter;
        uint16 residence;
        Options option;
        uint256 createdAt;
    }
}
