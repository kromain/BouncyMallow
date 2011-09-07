#include "widget.h"

#include <QGLShader>
#include <QGLShaderProgram>
#include <QMouseEvent>
#include <QPropertyAnimation>

#ifdef USE_FILE_SHADERS
#define VERTEX_SHADER_PATH      "z-bounce.vsh"
#define FRAGMENT_SHADER_PATH    "basic-texture.fsh"
#else
#define VERTEX_SHADER_PATH      ":/shaders/vertex/z-bounce"
#define FRAGMENT_SHADER_PATH    ":/shaders/fragment/basic-texture"
#endif

static const GLdouble cubeSize = 1.0;

GLSLTestWidget::GLSLTestWidget( const QGLFormat& glFormat, QWidget *parent)
    : QGLWidget(glFormat, parent),
      m_shaderProgram(0),
      m_mallowTexture(0),
      m_object(0),
      m_bounceRatio(1.0),
      m_xOffset(0.0),
      m_yOffset(0.0),
      m_zOffset(-2.0),
      m_lastMousePosition()
{
    QPropertyAnimation* pressAnimation = new QPropertyAnimation(this, "bounceRatio", this);
    pressAnimation->setEndValue( (GLfloat) 1.5);
    pressAnimation->setDuration(500);
    pressAnimation->setEasingCurve(QEasingCurve::OutCubic);
    connect(this, SIGNAL(pressed(QPoint)), pressAnimation, SLOT(start()));
    connect(pressAnimation, SIGNAL(valueChanged(QVariant)), this, SLOT(updateGL()));

    QPropertyAnimation* releaseAnimation = new QPropertyAnimation(this, "bounceRatio", this);
    releaseAnimation->setEndValue( (GLfloat) 1.0);
    releaseAnimation->setDuration(2000);
    releaseAnimation->setEasingCurve(QEasingCurve::OutElastic);
    connect(this, SIGNAL(released()), releaseAnimation, SLOT(start()));
    connect(releaseAnimation, SIGNAL(valueChanged(QVariant)), this, SLOT(updateGL()));
}

GLSLTestWidget::~GLSLTestWidget()
{
    deleteTexture(m_mallowTexture);
}

void GLSLTestWidget::initializeGL()
{
    qglClearColor(Qt::gray);

    glEnable(GL_DEPTH_TEST);
    glDepthFunc(GL_LESS);

    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);

    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glFrustum(-1.0, +1.0, -1.0, +1.0, 1.0, 5.0);

    m_mallowTexture = bindTexture( QPixmap( ":/images/mallow-happy" ) );

    m_object = cube();

    const bool useGLSL = QGLShader::hasOpenGLShaders(QGLShader::Fragment) &&
                         QGLShader::hasOpenGLShaders(QGLShader::Vertex) &&
                         QGLShaderProgram::hasOpenGLShaderPrograms();
    qDebug() << "Support for OpenGL Shaders:" <<  (useGLSL ? "yes" : "no");

    if (!useGLSL)
        return;

    m_shaderProgram = new QGLShaderProgram( context(),this );

    bool ok = false;
    ok = m_shaderProgram->addShaderFromSourceFile(QGLShader::Vertex, VERTEX_SHADER_PATH);
    if (!ok) {
        qDebug() << "Vertex shader compiling failed:" << m_shaderProgram->log();
        return;
    }
    ok = m_shaderProgram->addShaderFromSourceFile(QGLShader::Fragment, FRAGMENT_SHADER_PATH);
    if (!ok) {
        qDebug() << "Fragment shader compiling failed:" << m_shaderProgram->log();
        return;
    }

    ok = m_shaderProgram->link();
    if (!ok) {
        qDebug() << "Shader program linking failed:" << m_shaderProgram->log();
        return;
    }

}

void GLSLTestWidget::paintGL()
{
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    m_shaderProgram->bind();

    m_shaderProgram->setAttributeValue("txoffset", QVector3D(m_xOffset,m_yOffset,m_zOffset));
    m_shaderProgram->setAttributeValue("bounceRatio", (GLfloat) bounceRatio());

    glCallList(m_object);
}

void GLSLTestWidget::resizeGL(int w, int h)
{
    glViewport(0, 0, w, h);
}

GLuint GLSLTestWidget::cube()
{
    const int numfaces = 6;
    const int numvertexes = 6;
    static const int coords[numfaces][numvertexes][3] = {
        { { 0, 0, -1 }, { +1, -1, -1 }, { -1, -1, -1 }, { -1, +1, -1 }, { +1, +1, -1 }, { +1, -1, -1 } },
        { { 0, +1, 0 }, { +1, +1, -1 }, { -1, +1, -1 }, { -1, +1, +1 }, { +1, +1, +1 }, { +1, +1, -1 } },
        { { +1, 0, 0 }, { +1, -1, +1 }, { +1, -1, -1 }, { +1, +1, -1 }, { +1, +1, +1 }, { +1, -1, +1 } },
        { { -1, 0, 0 }, { -1, -1, -1 }, { -1, -1, +1 }, { -1, +1, +1 }, { -1, +1, -1 }, { -1, -1, -1 } },
        { { 0, -1, 0 }, { +1, -1, +1 }, { -1, -1, +1 }, { -1, -1, -1 }, { +1, -1, -1 }, { +1, -1, +1 } },
        { { 0, 0, +1 }, { -1, -1, +1 }, { +1, -1, +1 }, { +1, +1, +1 }, { -1, +1, +1 }, { -1, -1, +1 } }
    };

    double halfCubeSize = cubeSize/2;
    GLuint list = glGenLists(1);
    glNewList(list, GL_COMPILE);
    for (int i = 0; i < numfaces; ++i) {
        glBegin(GL_TRIANGLE_FAN);
        for (int j = 0; j < numvertexes; ++j) {
            if ( j == 0 ) {
                glTexCoord2d(0.5, 0.5);
            } else {
                // (1,0) (0,0) (0,1) (1,1) (1,0)
                glTexCoord2d((j == 1 || j == 4 || j == 5) ? 0.9 : 0.1, (j == 3 || j == 4) ? 0.9 : 0.1);
            }
            glVertex3d(halfCubeSize * coords[i][j][0], halfCubeSize * coords[i][j][1],
                       halfCubeSize * coords[i][j][2]);
        }
        glEnd();
    }

    glEndList();
    return list;
}

void GLSLTestWidget::mousePressEvent(QMouseEvent *e)
{
    if ( e->button() == Qt::LeftButton ) {
        emit pressed(e->pos());
    } else {
        m_lastMousePosition = e->pos();
    }
}

void GLSLTestWidget::mouseReleaseEvent(QMouseEvent *e)
{
    if ( e->button() == Qt::LeftButton ) {
        emit released();
    }
}

void GLSLTestWidget::mouseMoveEvent(QMouseEvent *e)
{
    if ( e->buttons() & Qt::RightButton ) {
        m_xOffset += (e->pos().x() - m_lastMousePosition.x()) * 2.0 / (double)width();
        m_yOffset += (m_lastMousePosition.y() - e->pos().y()) * 2.0 / (double)height();
        m_lastMousePosition = e->pos();
        updateGL();
    }
}


