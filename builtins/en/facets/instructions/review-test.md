Review the changes from a test quality perspective.

**Review criteria:**
- Whether all test plan items are covered
- Test quality (Given-When-Then structure, independence, reproducibility)
- Test naming conventions
- Completeness (unnecessary tests, missing cases)
- Appropriateness of mocks and fixtures
- When an external contract exists, whether request body / query / path input locations are verified as defined
- Whether the tests would catch an implementation that incorrectly reuses a response envelope for request parsing


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

1. First, extract prior open findings from report history and preliminarily classify them as `new / persists / resolved / reopened`
2. Cross-reference the test plan/test scope reports in the Report Directory with the implemented tests
3. When citing build, test, or functional verification as evidence, record the verified target, what was checked, and the observed result in the report
4. For each detected issue, classify as blocking/non-blocking based on Policy's scope determination table and judgment rules
5. If there is even one blocking issue, judge as REJECT
6. If an external contract exists and input locations (root body / query / path) are not verified, treat it as a coverage gap by default
