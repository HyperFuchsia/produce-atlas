# Madame Automata

A coin-operated fortune machine. You pay one fictional dollar, the machine takes it, and
it prints a ticket.

The conceit is that the machine is honest about what it is: it cannot see your future and
never claims to. Every ticket is a cold reading — an opener that is true of nearly everyone,
followed by advice that is generic *because* it is generic advice that actually works, plus
one concrete thing to do today.

## Running it

Open `index.html` in a browser. That's the whole app — one file, no build step, no
dependencies, no network calls. Nothing is stored or sent anywhere; the wallet and your
ticket stubs live in memory for the length of the visit.

## How a ticket is drawn

Readings live in the `BOOK` array in `index.html`. Each of the nine aspects — attention,
work, people, rest, money, decisions, change, craft, yourself — carries its own openers,
counsel, actions and a "favors" line, so a drawn ticket stays internally coherent instead of
mixing an opener about money with advice about sleep. A draw picks an aspect, then samples one
line from each of its pools.

To add material, add entries to the pools of an existing aspect or append a new aspect object
with the same shape.

## What brings you in?

Before pulling, you can tell the machine what you came in about — work, someone, a choice,
money, yourself, or "don't ask, just tell me." Each subject in `SUBJECTS` maps to a few
aspects and leans the draw toward them, but never guarantees them: about four tickets in five
land on the subject you named, and the fifth prints `the machine changed the subject` in the
footer instead of a colophon. That miss is deliberate. A machine that only ever gives you what
you asked for is a vending machine, not an oracle — and the advice you did not ask for is
often the advice worth reading.

Two constants control this:

- `LEAN` (24) — how much weight an on-subject aspect gets over an off-subject one.
- `RECENCY` (0.3) — how much the aspect drawn last time is damped, so free draws do not
  repeat themselves. It applies **only** to off-subject aspects: if you named a subject, a
  repeat is what you asked for, and damping it would quietly cancel out the lean.

Choosing "don't ask" clears the lean entirely and the draw is uniform across all nine aspects.

Your last twelve stubs stay on the page; older ones fall out of the pocket.

## The economy

You start with F$7. Each pull costs F$1. At zero the lever becomes "Check the coin return,"
which finds you another one — there is always one more fictional dollar, that being the nature
of fictional dollars.

## Design notes

The machine and the ticket are deliberately two different visual worlds. The cabinet is dark
enameled steel with oxidized brass trim and a humanist sans + monospace type system. The
ticket is a single-ink letterpress object — oxblood on pulp stock, old-style serif with
monospace labels — and it keeps the same paper color in light and dark themes, because a
printed thing does not change with the room it is read in.

The iris behind the glass is drawn on a canvas: nine ellipses rotating slightly out of step,
which tighten and brighten while the machine is thinking. Everything honors
`prefers-reduced-motion`.
