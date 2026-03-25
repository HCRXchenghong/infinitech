package idkit

import (
	"fmt"
	"sync"
)

var (
	logSeqMu      sync.Mutex
	logSeqMinute  string
	logSeqCounter int64
)

// NextLogTSID returns a minute-level 24-char TSID for logging use.
func NextLogTSID(bucket string) string {
	if bucket == "" {
		bucket = "98"
	}

	now := nowShanghai()
	minute := now.Format("0601021504")

	logSeqMu.Lock()
	defer logSeqMu.Unlock()

	if logSeqMinute != minute {
		logSeqMinute = minute
		logSeqCounter = 0
	}
	logSeqCounter++
	if logSeqCounter > MaxSequence {
		logSeqCounter = 1
	}
	return fmt.Sprintf("%s%s%s%06d", Prefix, bucket, minute, logSeqCounter)
}
