// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import {CommunityLedgerLib as Lib} from "./CommunityLedgerLib.sol";

interface ICommunityLedger {
    function addResident(address resident, uint16 residence) external;

    function removeResident(address resident) external;

    function setCounselor(address resident, bool isEntering) external;

    //TODO: Change setManager to be voted on by the community

    //TODO: Improve proposal creation to allow for more complex proposals
    function createProposal(
        string memory title,
        string memory description,
        Lib.Category category,
        uint256 amount,
        address responsible
    ) external;

    function editProposal(
        string memory proposalTitle,
        string memory description,
        uint256 amount,
        address responsible
    ) external;

    function removeProposal(string memory title) external;

    function openVote(string memory title) external;

    function vote(string memory title, Lib.Options option) external;

    function closeVote(string memory title) external;

    function getVotes(string memory title) external view returns (uint256);

    function payQuota(uint16 residenceId) external payable;
}
