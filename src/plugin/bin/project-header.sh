#!/bin/sh
# 出力は必ず JSON オブジェクト1個、終了コードは必ず 0。
# 解決できないときヘッダを付けないことが正常系の一部。
# 依存は sh と awk だけに保つ。
set -u
LC_ALL=C
export LC_ALL

dir=${1:-}
cfg="${PAPUT_HOME:-${HOME:-}/.paput}/projects"
alias_value=${PAPUT_PROJECT_ALIAS:-}

if [ -z "$alias_value" ] && [ -r "$cfg" ]; then
  alias_value=$(dir="$dir" awk '
    {
      line = $0
      sub(/^[ \t]+/, "", line)
      sub(/[ \t\r]+$/, "", line)
      if (line == "" || line ~ /^#/) next
      # 区切りは最初の空白列。以降は行末までをパスとして扱うので、空白やタブを
      # 含むパスも壊れない。
      if (match(line, /[ \t]+/)) {
        a = substr(line, 1, RSTART - 1)
        p = substr(line, RSTART + RLENGTH)
      } else {
        a = line
        p = ""
      }
      if (a ~ /[^a-z0-9]/ || length(a) < 3 || length(a) > 40) next
      if (p == "") { fallback = a; next }
      sub(/\/+$/, "", p)
      d = ENVIRON["dir"]
      if (p == "" || d == "") next
      if (d == p || index(d, p "/") == 1) {
        if (length(p) > best) { best = length(p); found = a }
      }
    }
    END { print (found != "" ? found : fallback) }
  ' "$cfg" 2>/dev/null)
fi

# 出口検証はシェルビルトインで行う。行志向のツールでは複数行の値が素通りする。
case $alias_value in
'' | *[!a-z0-9]*) alias_value='' ;;
esac
if [ ${#alias_value} -lt 3 ] || [ ${#alias_value} -gt 40 ]; then
  alias_value=''
fi

if [ -n "$alias_value" ]; then
  printf '{"X-PaPut-Project-Alias":"%s"}' "$alias_value"
else
  printf '{}'
fi
exit 0
