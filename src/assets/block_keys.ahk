#SingleInstance Force
#InstallKeybdHook
#UseHook
SetBatchLines, -1
ListHotkeys Off

; Bloqueia tecla Windows esquerda e direita
LWin::Return
RWin::Return

; Bloqueia atalhos do Windows
#r::Return
#x::Return
#d::Return
#l::Return
#e::Return
#i::Return
#s::Return
#tab::Return

; Bloqueia combinações comuns de saída
!tab::Return
!f4::Return
^esc::Return
^+esc::Return

; Bloqueia teclas de mídia/volume
Volume_Mute::Return
Volume_Down::Return
Volume_Up::Return
Media_Play_Pause::Return
Media_Next::Return
Media_Prev::Return
Browser_Home::Return
