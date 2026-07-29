# Milestone 4: Working Ability Pool

Milestone 4 applies the Enemy Lab audition-and-promotion workflow to Combat Arena cards.

## Card inventory

The canonical Combat Arena ability catalog contains 79 existing card identities:

- 30 standard stance cards
- 1 special stance: Bing Bong
- 46 Wizard of Legend Arcana cards
- 1 direct ability: Powbunker
- 1 combat modifier: Blood Slash

The catalog preserves each original card object. Ability runtime events, Arcana metadata, charge behavior, manual sequences, and UI fields remain owned by their existing implementations.

## Working Ability Pool

Enemy Lab now contains a separate **ABILITY POOL** category.

- the pool starts empty
- selections persist locally
- cards can be filtered by family
- individual cards or the visible family can be added or removed
- selecting cards does not immediately replace the Current Deck

This separation is intentional:

- **Current Deck** is the exact deck used for immediate card testing
- **Working Ability Pool** is the larger availability set that future Combat Arena run setup and room rewards will draw from

## Next step

After the pool UI is validated, wire Combat Arena's run offers and reward choices to the saved Working Ability Pool. An empty pool will preserve the existing fallback card pools so current gameplay cannot be soft-locked.
