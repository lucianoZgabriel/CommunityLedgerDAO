// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import "./CommunityLedgerLib.sol";

interface ICommunityLedger {
    function addResident(address resident, uint16 residence) external;

    function removeResident(address resident) external;

    function setCounselor(address resident, bool isEntering) external;

    //TODO: Change setManager to be voted on by the community
    function setManager(address newManager) external;

    //TODO: Improve proposal creation to allow for more complex proposals
    function createProposal(
        string memory title,
        string memory description
    ) external;

    function removeProposal(string memory title) external;

    function openVote(string memory title) external;

    function vote(
        string memory title,
        CommunityLedgerLib.Options option
    ) external;

    function closeVote(string memory title) external;

    function getVotes(string memory title) external view returns (uint256);

    //TODO: Create Edit Proposal function

    //TODO: Set quota for resident

    //TODO: Pay quota

    //TODO: Create a function to allow the manager to pay the bills
}
