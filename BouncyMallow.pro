TEMPLATE     = app
QT          += opengl

use_file_shaders:DEFINES += USE_FILE_SHADERS

HEADERS     += widget.h
SOURCES     += main.cpp widget.cpp

RESOURCES   += images.qrc shaders.qrc

OTHER_FILES += \
    z-bounce.vsh \
    simple-camera-projection.vsh \
    basic-texture.fsh \
    cubemap-texture.fsh \





