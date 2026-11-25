#!/bin/bash
# Samples pg_stat_activity + blocking locks of the owned test cluster every second into $1 until the cluster goes away.
OUT=$1; : > $OUT
until D=$(ls -d /tmp/nevora-payroll-owned-*/data 2>/dev/null | head -1) && [ -f "$D/postmaster.pid" ]; do sleep 1; done
PORT=$(sed -n 4p $D/postmaster.pid); echo "cluster $D port $PORT" >> $OUT
while [ -f "$D/postmaster.pid" ]; do
  /usr/lib/postgresql/16/bin/psql -h 127.0.0.1 -p $PORT -U nevora_test -d postgres -XAtq -c "
SELECT to_char(clock_timestamp(),'HH24:MI:SS')||' pid='||a.pid||' db='||a.datname||' state='||coalesce(a.state,'')||' wait='||coalesce(a.wait_event_type,'')||'/'||coalesce(a.wait_event,'')||' xact_age='||coalesce(round(extract(epoch from clock_timestamp()-a.xact_start))::text,'-')||'s q_age='||coalesce(round(extract(epoch from clock_timestamp()-a.query_start))::text,'-')||'s blocked_by='||coalesce(array_to_string(pg_blocking_pids(a.pid),','),'')||' query='||left(regexp_replace(a.query,'\s+',' ','g'),160)
FROM pg_stat_activity a WHERE a.backend_type='client backend' AND a.pid<>pg_backend_pid() AND (a.wait_event_type='Lock' OR (a.state<>'idle' AND a.query_start < clock_timestamp()-interval '2 seconds') OR cardinality(pg_blocking_pids(a.pid))>0 OR (a.state='idle in transaction' AND a.xact_start < clock_timestamp()-interval '2 seconds'));" >> $OUT 2>/dev/null
  sleep 1
done
echo "cluster gone $(date -u +%T)" >> $OUT
