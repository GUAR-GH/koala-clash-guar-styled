!macro customInit
  ; --- Optional profile migration from old Koala Clash app ---

  ; Force current user context to resolve $APPDATA correctly
  ; (perMachine installers may default to all-users context)
  SetShellVarContext current

  ; Check if old profiles.yaml exists and back it up
  ; Try Roaming AppData first, then Local AppData as fallback
  IfFileExists "$APPDATA\io.github.koala-clash\profiles.yaml" 0 check_localappdata
    CopyFiles /SILENT "$APPDATA\io.github.koala-clash\profiles.yaml" "$TEMP\koala-clash-migration-profiles.yaml"
    Goto backup_done
  check_localappdata:
  IfFileExists "$LOCALAPPDATA\io.github.koala-clash\profiles.yaml" 0 backup_done
    CopyFiles /SILENT "$LOCALAPPDATA\io.github.koala-clash\profiles.yaml" "$TEMP\koala-clash-migration-profiles.yaml"
  backup_done:

  ; Restore context for the rest of the installer
  SetShellVarContext all
!macroend

!macro customInstall
  ; Remove stale elevated runner tasks from dev/old builds before the app recreates them.
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "guar-clash-run" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "koala-clash-run" /F'

  ; --- Copy migration file to new app data directory ---
  SetShellVarContext current
  IfFileExists "$TEMP\koala-clash-migration-profiles.yaml" 0 no_migration_file
    CreateDirectory "$APPDATA\GUAR Clash"
    CopyFiles /SILENT "$TEMP\koala-clash-migration-profiles.yaml" "$APPDATA\GUAR Clash\.migration-profiles.yaml"
    Delete "$TEMP\koala-clash-migration-profiles.yaml"
  no_migration_file:
  SetShellVarContext all
!macroend

!macro customUnInstall
  ; Clean up elevated runner tasks so future installs cannot launch an old exe path.
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "guar-clash-run" /F'
  ExecWait '"$SYSDIR\schtasks.exe" /Delete /TN "koala-clash-run" /F'
!macroend
