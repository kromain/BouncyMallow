TEMPLATE     = app
QT          += opengl

HEADERS     += widget.h
SOURCES     += main.cpp widget.cpp

RESOURCES   += images.qrc shaders.qrc

OTHER_FILES += \
    z-bounce.vsh \
    basic-texture.fsh





