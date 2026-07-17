// Phone-landscape overrides for the run setup and room reward overlays.
// This stays separate from the draft controller so compact-screen tuning can
// change without touching combat or card-selection logic.
if (typeof document !== 'undefined' && !document.getElementById('runDraftCompactStyles')) {
  const style = document.createElement('style');
  style.id = 'runDraftCompactStyles';
  style.textContent = `
    @media (orientation: landscape) and (max-height: 520px) {
      #startGate {
        align-items: flex-start !important;
        padding: max(4px, env(safe-area-inset-top)) max(6px, env(safe-area-inset-right)) max(4px, env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left)) !important;
      }
      #startCard.runDraftCard {
        width: min(980px, 100%) !important;
        padding: 6px 8px !important;
        border-radius: 7px !important;
        box-shadow: 0 3px 0 rgba(0,0,0,.28) !important;
      }
      #startCard .sgTitle {
        font-size: 11px !important;
        line-height: 1.1 !important;
        margin: 0 0 4px !important;
      }
      #startCard .sgHint,
      .runOfferProfile,
      .runStarterCard span,
      #runSetupActions {
        display: none !important;
      }
      #runOfferGrid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 5px !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      .runOffer {
        min-width: 0 !important;
        padding: 5px !important;
        border-radius: 6px !important;
      }
      .runOfferWeapon {
        font-size: 11px !important;
        line-height: 1.05 !important;
        margin-bottom: 4px !important;
      }
      .runFixedStances {
        gap: 3px !important;
        margin-bottom: 4px !important;
      }
      .runFixedStance {
        padding: 3px 2px !important;
        font-size: 8px !important;
        line-height: 1.05 !important;
      }
      .runFixedStance b {
        font-size: 8px !important;
        margin-bottom: 1px !important;
      }
      .runStarterCards {
        gap: 3px !important;
      }
      .runStarterCard {
        padding: 4px !important;
        min-height: 0 !important;
      }
      .runStarterCard b {
        font-size: 8px !important;
        line-height: 1.1 !important;
      }
      #cardRewardGate {
        align-items: flex-start !important;
        padding: max(4px, env(safe-area-inset-top)) 6px max(4px, env(safe-area-inset-bottom)) !important;
      }
      #cardRewardCard {
        padding: 7px !important;
      }
      #cardRewardTitle {
        font-size: 11px !important;
        margin-bottom: 2px !important;
      }
      #cardRewardHint {
        display: none !important;
      }
      #cardRewardChoices {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 5px !important;
      }
      .rewardChoice {
        min-height: 72px !important;
        padding: 5px !important;
      }
      .rewardChoice .rewardType {
        margin-bottom: 3px !important;
      }
      .rewardChoice b {
        font-size: 9px !important;
      }
      .rewardChoice span {
        font-size: 8px !important;
        line-height: 1.2 !important;
        margin-top: 3px !important;
      }
      #cardRewardSkip {
        padding: 6px !important;
        margin-top: 5px !important;
      }
    }
  `;
  document.head.appendChild(style);
}
