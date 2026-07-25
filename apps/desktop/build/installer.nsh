; MoreMe NSIS customization.
;
; Problem this solves: MoreMe can be running in the tray (or as a leftover
; process) when the user installs an update. Windows then refuses to
; overwrite MoreMe.exe, the installer shows "Can't close MoreMe / Retry",
; and clicking Retry often "succeeds" without actually replacing the
; binary — so the user installs an update and gets the old app.
;
; Fix: force-terminate any running MoreMe before file replacement, on both
; install and uninstall. taskkill /T also takes the GPU/utility children.
; Failure is non-fatal — if nothing is running, taskkill just returns
; non-zero and we carry on.

!macro customInit
  DetailPrint "Closing any running MoreMe..."
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /IM "MoreMe.exe" /T'
  Pop $0
  ; Give Windows a moment to release the file handles before we copy over them.
  Sleep 1500
!macroend

!macro customUnInit
  DetailPrint "Closing any running MoreMe..."
  nsExec::Exec '"$SYSDIR\taskkill.exe" /F /IM "MoreMe.exe" /T'
  Pop $0
  Sleep 1500
!macroend
