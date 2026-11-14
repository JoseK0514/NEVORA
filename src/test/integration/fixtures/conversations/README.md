# Optional SCRUM-185 fixture

`0061_staff_tasks.sql` is test data setup only, copied byte-for-byte from
`JoseK0514/Fuel-Scheduler-` commit `21a9008f51091f711a96ad52e56eefdd90ac1f44`,
path `db/migrations/0061_staff_tasks.sql`.
SHA-256: `ebe9e46d3519fe0bf7ab25eaf380524273e4297e836332d2a4efcc2fd5664f17`.
The product migration manifest does not import this fixture or the unfinished UI.
When the actual staff-task backend is integrated, its migration remains owned by
SCRUM-185. Conversations detects the installed table and checks current source
permissions; an absent table disables task attachment without breaking chat.
