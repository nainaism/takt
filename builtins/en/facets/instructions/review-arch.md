Focus on reviewing **architecture and design**.
Do not review AI-specific issues (already covered by the ai_review step).

**Review criteria:**
- Structural and design validity
- Modularization (high cohesion, low coupling, no circular dependencies)
- Functionalization (single responsibility per function, operation discoverability, consistent abstraction level)
- Code quality
- Appropriateness of change scope
- Test coverage
- Dead code
- Call chain verification
- Scattered hardcoding of contract strings (file names, config key names)


**Design decisions reference:**
Review {report:coder-decisions.md} to understand the recorded design decisions.
- Do not flag intentionally documented decisions as FP
- However, also evaluate whether the design decisions themselves are sound, and flag any problems

**Previous finding tracking (required):**
- First, inspect the review result previously produced by this step and its timestamped history in the Report Directory, treating the unversioned file as the latest result and the most recent timestamped file as the previous result
- If "Previous Response" is available, use it only as supporting context; use report history as the source of truth for finding state transitions
- Assign `finding_id` to each finding and classify current status as `new / persists / resolved / reopened`
- If status is `persists`, provide concrete unresolved evidence (file/line)
- Do not drop open findings from the prior report when producing the current report

## Judgment Procedure

1. First, extract previous open findings and preliminarily classify as `new / persists / resolved / reopened`
2. Review the change diff and detect issues based on the architecture and design criteria above
   - Cross-check changes against REJECT criteria tables defined in knowledge
   - If you find a DRY violation, require it to be fixed
   - Before proposing a fix, verify that the consolidation target fits existing responsibility boundaries, contracts, and public API shape
   - If you require a new wrapper, helper, or public API, explain why that abstraction target is the natural one
   - If the proposed abstraction goes beyond the task spec or plan, state why the additional scope is necessary and justified
   - When citing build, test, or functional verification as evidence, record the verified target, what was checked, and the observed result in the report
3. For each detected issue, classify as blocking/non-blocking based on Policy's scope determination table and judgment rules
4. If there is even one blocking issue (`new`, `persists`, or `reopened`), judge as REJECT
