// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./ICommunityLedger.sol";

contract CommunityLedgerAdapter {
    ICommunityLedger public implementation;
    address public immutable i_owner;

    constructor() {
        i_owner = msg.sender;
    }

    modifier implementationSet() {
        require(
            address(implementation) != address(0),
            "Implementation not set"
        );
        _;
    }

    function getImplAddress() external view returns (address) {
        return address(implementation);
    }

    function setImplementation(address _implementation) external {
        require(
            msg.sender == i_owner,
            "Only the owner can set the implementation"
        );
        require(
            _implementation != address(0),
            "Invalid implementation address"
        );
        implementation = ICommunityLedger(_implementation);
    }

    function addResident(
        address _resident,
        uint16 _residence
    ) external implementationSet {
        implementation.addResident(_resident, _residence);
    }

    function removeResident(address _resident) external implementationSet {
        implementation.removeResident(_resident);
    }

    function setCounselor(
        address _resident,
        bool _isEntering
    ) external implementationSet {
        implementation.setCounselor(_resident, _isEntering);
    }

    function createProposal(
        string memory _title,
        string memory _description,
        Lib.Category _category,
        uint256 _amount,
        address _responsible
    ) external implementationSet {
        implementation.createProposal(
            _title,
            _description,
            _category,
            _amount,
            _responsible
        );
    }

    function editProposal(
        string memory _proposalTitle,
        string memory _description,
        uint256 _amount,
        address _responsible
    ) external implementationSet {
        implementation.editProposal(
            _proposalTitle,
            _description,
            _amount,
            _responsible
        );
    }

    function removeProposal(string memory _title) external implementationSet {
        implementation.removeProposal(_title);
    }

    function openVote(string memory _title) external implementationSet {
        implementation.openVote(_title);
    }

    function vote(
        string memory _title,
        Lib.Options _option
    ) external implementationSet {
        implementation.vote(_title, _option);
    }

    function closeVote(string memory _title) external implementationSet {
        implementation.closeVote(_title);
    }

    function payQuota(uint16 residenceId) external payable implementationSet {
        implementation.payQuota{value: msg.value}(residenceId);
    }
}
