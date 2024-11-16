!macro customHeader
  # Add custom headers here
!macroend

!macro customInit
  # Add custom initialization here
!macroend

!macro customInstall
  # Create a README file in the installation directory explaining the Windows Defender warning
  FileOpen $0 "$INSTDIR\IMPORTANT_README.txt" w
  FileWrite $0 "Thank you for installing TaskMaster!$\r$\n$\r$\n"
  FileWrite $0 "If Windows Defender or your antivirus software shows a warning, this is a false positive.$\r$\n"
  FileWrite $0 "TaskMaster is a desktop application built with Electron, which sometimes triggers these warnings.$\r$\n$\r$\n"
  FileWrite $0 "To use TaskMaster:$\r$\n"
  FileWrite $0 "1. Click 'More info' if Windows SmartScreen appears$\r$\n"
  FileWrite $0 "2. Click 'Run anyway'$\r$\n$\r$\n"
  FileWrite $0 "The application is safe to use and you can verify the source code at:$\r$\n"
  FileWrite $0 "https://github.com/dmdavidkov/taskmaster$\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  # Clean up
  Delete "$INSTDIR\IMPORTANT_README.txt"
!macroend
