import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CommunityLedgerModule = buildModule("CommunityLedgerModule", (m) => {
  const communityLedger = m.contract("CommunityLedger");

  const communityLedgerAdapter = m.contract("CommunityLedgerAdapter");

  m.call(communityLedgerAdapter, "setImplementation", [communityLedger]);

  return {
    communityLedger,
    communityLedgerAdapter,
  };
});

export default CommunityLedgerModule;
