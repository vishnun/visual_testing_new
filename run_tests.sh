#!/usr/bin/env bash

# Run PhantomCSS Tests
# For Running against
# To Run the tests use the following command
#

set -e

csvPath="TestUrls.csv"
viewport_type=null

usage() {
     echo "Usage: $0 [-f csv-file-path] [-v viewport] " 1>&2;
     echo "Options::" 1>&2;
     echo "   -f default is: $csvPath" 1>&2;
     echo "   -v viewport:  default is: All. Options are: desktop / mobile / mobile-landscape / tablet / tablet-landscape" 1>&2;
    exit 1;
    }

while getopts ":s: :t: v: f:" opt; do
  case "${opt}" in
    v)
      v=${OPTARG}
	  if [ ${v} != '' ]; then
         viewport_type=${v}
      fi
      ;;
    f)
      f=${OPTARG}
	  if [ ${f} != '' ]; then
         csvPath=${f}
      fi
      ;;
    h|\?)
      usage
      exit 1
      ;;
    :)
      echo "Option -$OPTARG requires an argument." >&2
      usage
      exit 1
      ;;
  esac
done

shift $((OPTIND-1))

export phantomcss_csvfile="$csvPath"
export phantomcss_viewport_for_tests="$viewport_type"

casperjs test run_tests_from_csv.js
