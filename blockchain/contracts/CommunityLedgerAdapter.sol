// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./ICommunityLedger.sol";

contract CommunityLedgerAdapter {
    ICommunityLedger public implementation;
    address public immutable i_owner;

    event QuotaChanged(uint256 amount);
    event ManagerChanged(address manager);
    event ProposalChanged(
        bytes32 indexed proposalId,
        string title,
        Lib.VoteStatus indexed status
    );
    event Transfer(address to, uint256 indexed amout, string proposalTitle);

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
        Lib.ProposalUpdate memory proposalUpdate = implementation.editProposal(
            _proposalTitle,
            _description,
            _amount,
            _responsible
        );
        emit ProposalChanged(
            proposalUpdate.proposalId,
            proposalUpdate.title,
            proposalUpdate.status
        );
    }

    function removeProposal(string memory _title) external implementationSet {
        Lib.ProposalUpdate memory proposalUpdate = implementation
            .removeProposal(_title);
        emit ProposalChanged(
            proposalUpdate.proposalId,
            proposalUpdate.title,
            proposalUpdate.status
        );
    }

    function openVote(string memory _title) external implementationSet {
        Lib.ProposalUpdate memory proposalUpdate = implementation.openVote(
            _title
        );
        emit ProposalChanged(
            proposalUpdate.proposalId,
            proposalUpdate.title,
            proposalUpdate.status
        );
    }

    function vote(
        string memory _title,
        Lib.Options _option
    ) external implementationSet {
        implementation.vote(_title, _option);
    }

    function closeVote(string memory _title) external implementationSet {
        Lib.ProposalUpdate memory proposalUpdate = implementation.closeVote(
            _title
        );
        emit ProposalChanged(
            proposalUpdate.proposalId,
            proposalUpdate.title,
            proposalUpdate.status
        );

        if (proposalUpdate.status == Lib.VoteStatus.APPROVED) {
            if (proposalUpdate.category == Lib.Category.CHANGE_MANAGER) {
                emit ManagerChanged(implementation.getManager());
            }

            if (proposalUpdate.category == Lib.Category.CHANGE_QUOTA) {
                emit QuotaChanged(implementation.getQuota());
            }
        }
    }

    function payQuota(uint16 residenceId) external payable implementationSet {
        implementation.payQuota{value: msg.value}(residenceId);
    }

    function transfer(
        string memory _proposalTitle,
        uint256 _amount
    ) external implementationSet {
        Lib.TransferReceipt memory transferReceipt = implementation.transfer(
            _proposalTitle,
            _amount
        );
        emit Transfer(
            transferReceipt.to,
            transferReceipt.amount,
            transferReceipt.proposalTitle
        );
    }
}
