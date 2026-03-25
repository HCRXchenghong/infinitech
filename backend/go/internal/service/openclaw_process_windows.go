//go:build windows

package service

import "os/exec"

func applyDetachedProcessAttrs(cmd *exec.Cmd) {
	if cmd == nil {
		return
	}
}
