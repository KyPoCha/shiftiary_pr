# Task 1: Customer Account Administration

## Product Interpretation

The assessment uses one admin product with a `Customer Accounts` area. A hospital can have multiple department accounts, accounts can belong to groups, feature toggles can be inherited or overridden, and shadow login requires explicit policy and audit visibility.

The word `account` is intentionally treated as overloaded:

- Commercial customer: the legal hospital relationship.
- Tenant account: a department workspace such as ICU, Emergency, or Surgery.
- Login identity: a human user who signs in.
- Configuration target: the object that owns feature toggles and generator settings.
- Shadow-login target: the account an admin can impersonate.
- Group member: an account that can inherit shared settings.

The UI separates those meanings so admins do not confuse hospital-level changes, department-level changes, and human-user access.

## Current UI Shape

- Left navigation separates `Customer Accounts` from future `Generator Evaluation`.
- Account directory supports finding a department account across customers.
- Portfolio metrics summarize the selected customer's account surface.
- Account overview summarizes scale, ownership, plan, recent activity, and risk signals.
- Relationship panel shows the selected account, parent customer, account groups, and sibling accounts.
- Feature toggle panel shows state distribution, inheritance source, risk, and last change.
- Shadow login panel shows actor policy, session limit, active sessions, and the start-session action.
- Audit history keeps security-sensitive changes close to the account detail page and can be filtered by severity.
- Contextual help buttons explain each area without adding permanent instructional text to the workflow.

## Implemented Prototype Workflows

- Create a local draft department account for the selected customer.
- Add or remove the selected account from customer-level account groups.
- Change feature-toggle state between `enabled`, `disabled`, and `inherited`.
- Start a shadow-login session from a confirmation modal, with optional reason for eligible SLA/support workers.
- End an active shadow-login session.
- Record local audit events for account creation, relationship changes, toggle changes, and shadow-login sessions.
- Filter audit history by severity to focus on warning or critical events.
- Open contextual help for account directory, overview, relationships, feature toggles, shadow login, and audit history.

## Design Rationale

The first screen is operational rather than marketing-like: dense enough for support and superadmin work, but still readable in a meeting. Sensitive operations are visible but isolated: shadow login has its own panel, and every risky toggle has a risk badge and audit context.

Groups are represented as first-class objects because they explain inheritance. Without showing groups next to toggles, an admin cannot tell whether a setting was intentionally overridden or simply inherited from a broader customer policy.

Help is intentionally split into two layers. Contextual help is available from small icon buttons near each workflow, while the separate Help Center route gives the full explanation and assessment rationale.

The visual system uses a hospital-blue palette, contrast-checked status colors, and rem-based spacing/type sizing. Dense grids use desktop, tablet, and mobile breakpoints so the admin remains scannable outside a wide desktop viewport.

## Next Product Questions

- Can customer admins manage groups, or only internal superadmins?
- Which feature toggles are allowed to inherit from a group?
- Which customer/account policies should make the shadow-login reason required?
- Are billing/account ownership concepts visible to support admins?
- Should archived accounts remain shadow-login targets for historical support?
