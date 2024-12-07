// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./ICommunityLedger.sol";

contract CommunityLedgerAdapter {
    ICommunityLedger public implementation;
    address public immutable i_owner;

    constructor() {
        i_owner = msg.sender;
    }

    function getImplAddress() external view returns (address) {
        return address(implementation);
    }

    function setImplementation(address _implementation) external {
        require(
            msg.sender == i_owner,
            "Only the owner can set the implementation"
        );
        implementation = ICommunityLedger(_implementation);
    }

    function addResident(address _resident, uint16 _residence) external {
        implementation.addResident(_resident, _residence);
    }

    function removeResident(address _resident) external {
        implementation.removeResident(_resident);
    }

    function setCounselor(address _resident, bool _isEntering) external {
        implementation.setCounselor(_resident, _isEntering);
    }

    function createProposal(
        string memory _title,
        string memory _description,
        Lib.Category _category,
        uint256 _amount,
        address _responsible
    ) external {
        implementation.createProposal(
            _title,
            _description,
            _category,
            _amount,
            _responsible
        );
    }

    function removeProposal(string memory _title) external {
        implementation.removeProposal(_title);
    }

    function openVote(string memory _title) external {
        implementation.openVote(_title);
    }

    function vote(string memory _title, Lib.Options _option) external {
        implementation.vote(_title, _option);
    }

    function closeVote(string memory _title) external {
        implementation.closeVote(_title);
    }
}
