#include "widget.h"

#include <QGLShader>
#include <QGLShaderProgram>
#include <QMouseEvent>
#include <QPropertyAnimation>
#include <QMatrix4x4>
#include <qmath.h>

#ifdef USE_FILE_SHADERS
#define VERTEX_SHADER_PATH      "z-bounce.vsh"
#define FRAGMENT_SHADER_PATH    "basic-texture.fsh"
#else
#define VERTEX_SHADER_PATH      ":/shaders/vertex/z-bounce"
#define FRAGMENT_SHADER_PATH    ":/shaders/fragment/basic-texture"
#endif

namespace {
    const int      numCubeFaces = 6;
    const int      numCubeFaceVertices = 6;

    qreal deg2rad( int deg ) {
        return (deg % 360) * M_PI / 180;
    }
}
GLSLTestWidget::GLSLTestWidget( const QGLFormat& glFormat, QWidget *parent)
    : QGLWidget(glFormat, parent),
      m_shaderProgram(0),
      m_cubeVertices(),
      m_cubeTexCoords(),
      m_mallowTexture(0),
      m_bounceRatio(1.0),
      m_hRotation(45),
      m_vRotation(-45),
      m_zOffset(-5.0),
      m_lastMousePosition()
{
    QPropertyAnimation* pressAnimation = new QPropertyAnimation(this, "bounceRatio", this);
    pressAnimation->setEndValue( (GLfloat) 0.5);
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

    initCubeData();

    m_mallowTexture = bindTexture( QPixmap( ":/images/mallow-happy" ) );

    const bool useGLSL = QGLShader::hasOpenGLShaders(QGLShader::Fragment) &&
                         QGLShader::hasOpenGLShaders(QGLShader::Vertex) &&
                         QGLShaderProgram::hasOpenGLShaderPrograms();
    qDebug() << "Support for OpenGL Shaders:" <<  (useGLSL ? "yes" : "no");

    if (!useGLSL)
        return;

    m_shaderProgram = new QGLShaderProgram(this);

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

    m_shaderProgram->bind();

    m_shaderProgram->enableAttributeArray("aVertex");
    m_shaderProgram->setAttributeArray("aVertex", m_cubeVertices.constData());
    m_shaderProgram->enableAttributeArray("aTexCoord");
    m_shaderProgram->setAttributeArray("aTexCoord", m_cubeTexCoords.constData());
    m_shaderProgram->setAttributeValue("vBounceRatio", (GLfloat) bounceRatio());

    QMatrix4x4 projectionMatrix;
    projectionMatrix.perspective(45.0f, 1.0, 1.0f, 20.0f);
    m_shaderProgram->setUniformValue("projectionMatrix", projectionMatrix);

    const QVector3D cameraPos( qSin( deg2rad(m_hRotation) ) * qCos( deg2rad(m_vRotation) ) * m_zOffset,
                               qSin( deg2rad(m_vRotation) ) * m_zOffset,
                               qCos( deg2rad(m_hRotation) ) * qCos( deg2rad(m_vRotation) ) * m_zOffset) ;
    QMatrix4x4 cameraMatrix;
    cameraMatrix.lookAt( cameraPos, QVector3D(), QVector3D(0, (qAbs(m_vRotation) < 90 || qAbs(m_vRotation) > 270) ? 1 : -1, 0) );
    m_shaderProgram->setUniformValue("cameraMatrix", cameraMatrix);

#ifdef DEBUG_CAMERA
    qDebug() << "Camera position:" <<  cameraPos << "x-rotation=" << m_hRotation << "y-rotation=" << m_vRotation;
#endif

    for (int face = 0; face < numCubeFaces; ++face) {
        glDrawArrays(GL_TRIANGLE_FAN, face * numCubeFaceVertices, numCubeFaceVertices);
    }
}

void GLSLTestWidget::resizeGL(int w, int h)
{
    glViewport(0, 0, w, h);
}

void GLSLTestWidget::initCubeData()
{
    if ( !m_cubeVertices.empty() || !m_cubeTexCoords.empty() ) {
        // already initialized
        return;
    }

    static const int coords[numCubeFaces][numCubeFaceVertices][3] = {
        { { 0, 0, -1 }, { +1, -1, -1 }, { -1, -1, -1 }, { -1, +1, -1 }, { +1, +1, -1 }, { +1, -1, -1 } },
        { { 0, +1, 0 }, { +1, +1, -1 }, { -1, +1, -1 }, { -1, +1, +1 }, { +1, +1, +1 }, { +1, +1, -1 } },
        { { +1, 0, 0 }, { +1, -1, +1 }, { +1, -1, -1 }, { +1, +1, -1 }, { +1, +1, +1 }, { +1, -1, +1 } },
        { { -1, 0, 0 }, { -1, -1, -1 }, { -1, -1, +1 }, { -1, +1, +1 }, { -1, +1, -1 }, { -1, -1, -1 } },
        { { 0, -1, 0 }, { +1, -1, +1 }, { -1, -1, +1 }, { -1, -1, -1 }, { +1, -1, -1 }, { +1, -1, +1 } },
        { { 0, 0, +1 }, { -1, -1, +1 }, { +1, -1, +1 }, { +1, +1, +1 }, { -1, +1, +1 }, { -1, -1, +1 } }
    };

    for (int i = 0; i < numCubeFaces; ++i) {
        for (int j = 0; j < numCubeFaceVertices; ++j) {
            m_cubeVertices << QVector3D(coords[i][j][0], coords[i][j][1], coords[i][j][2]);
            if ( !j ) {
                m_cubeTexCoords << QVector2D(0.5, 0.5);
            } else {
                // (1,0) (0,0) (0,1) (1,1) (1,0)
                m_cubeTexCoords << QVector2D((j == 1 || j == 4 || j == 5) ? 1.0 : 0.0, (j == 3 || j == 4) ? 1.0 : 0.0);
            }
        }
    }
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
        m_hRotation += (m_lastMousePosition.x() - e->pos().x());
        m_vRotation += (m_lastMousePosition.y() - e->pos().y());

        m_lastMousePosition = e->pos();
        updateGL();
    }
}

void GLSLTestWidget::wheelEvent(QWheelEvent *e)
{
    m_zOffset += ( e->delta() > 0 ) ? 0.1 : -0.1;
    updateGL();
}


