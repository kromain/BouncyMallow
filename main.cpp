#include "widget.h"

#include <QApplication>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);

    QGLFormat f;
#ifdef USE_SAMPLE_BUFFERS
    f.setSampleBuffers(true);
#endif
    GLSLTestWidget w(f);
    w.show();

    return a.exec();
}
