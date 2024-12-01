import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CommunityLedgerModule = buildModule("CommunityLedgerModule", (m) => {
  const communityLedger = m.contract("CommunityLedger");
  return { communityLedger };
});

export default CommunityLedgerModule;
