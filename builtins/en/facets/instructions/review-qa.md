Review the changes from a quality assurance perspective.

**Review criteria:**
- Test coverage and quality
- Test strategy (unit/integration/E2E)
- Error handling
- Logging and monitoring
- Maintainability


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
2. Review the change diff and detect issues based on the quality assurance criteria above
   - Cross-check changes against REJECT criteria tables defined in knowledge
   - Even if tests pass, verify whether any additional change outside the task or plan is justified
   - If review-driven follow-up changes expand the design, evaluate whether that extra change is actually necessary
   - When citing build, test, or functional verification as evidence, record the verified target, what was checked, and the observed result in the report
3. For each detected issue, classify as blocking/non-blocking based on Policy's scope determination table and judgment rules
4. If there is even one blocking issue (`new`, `persists`, or `reopened`), judge as REJECT
