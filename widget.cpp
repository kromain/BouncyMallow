#include "widget.h"

#include <QGLShader>
#include <QGLShaderProgram>
#include <QMouseEvent>
#include <QPropertyAnimation>
#include <QMatrix4x4>
#include <qmath.h>

#ifdef QT_OPENGL_ES_2
#include <GLES2/gl2extimg.h>
#endif

#if !defined(GL_BGRA) && defined(GL_BGRA_EXT)
#define GL_BGRA_EXT GL_BGRA
#endif

#ifdef USE_FILE_SHADERS
#define CUBE_VERTEX_SHADER_PATH      "z-bounce.vsh"
#define CUBE_FRAGMENT_SHADER_PATH    "basic-texture.fsh"
#define ENV_VERTEX_SHADER_PATH      "simple-camera-projection.vsh"
#define ENV_FRAGMENT_SHADER_PATH    "cubemap-texture.fsh"
#else
#define CUBE_VERTEX_SHADER_PATH      ":/shaders/vertex/z-bounce"
#define CUBE_FRAGMENT_SHADER_PATH    ":/shaders/fragment/basic-texture"
#define ENV_VERTEX_SHADER_PATH      ":/shaders/vertex/simple-camera-projection"
#define ENV_FRAGMENT_SHADER_PATH    ":/shaders/fragment/cubemap-texture"
#endif

// Windows lacks the cubemap definitions in its headers, but the drivers handle those fine
#ifndef GL_TEXTURE_CUBE_MAP
#define GL_TEXTURE_CUBE_MAP             0x8513
#define GL_TEXTURE_BINDING_CUBE_MAP     0x8514
#define GL_TEXTURE_CUBE_MAP_POSITIVE_X  0x8515
#define GL_TEXTURE_CUBE_MAP_NEGATIVE_X  0x8516
#define GL_TEXTURE_CUBE_MAP_POSITIVE_Y  0x8517
#define GL_TEXTURE_CUBE_MAP_NEGATIVE_Y  0x8518
#define GL_TEXTURE_CUBE_MAP_POSITIVE_Z  0x8519
#define GL_TEXTURE_CUBE_MAP_NEGATIVE_Z  0x851A
#endif

namespace {
    const int      numCubeFaces = 6;
    const int      numCubeFaceVertices = 6;
    const int      numCubemapFaceVertices = 4;

    const int cubeSideLength = 50;

    const qreal xPanningMultiplier = 0.3;
    const qreal yPanningMultiplier = 0.3;

    qreal deg2rad( qreal deg ) {
        qreal adjustedDeg = deg;
        if ( qAbs(deg) >= 360.0 ) {
            adjustedDeg += 360.0 * (deg > 0.0 ? -1: 1);
        }
        return adjustedDeg * M_PI / 180;
    }
}
GLSLTestWidget::GLSLTestWidget( const QGLFormat& glFormat, QWidget *parent)
    : QGLWidget(glFormat, parent),
      m_cubeShaderProgram(0),
      m_envShaderProgram(0),
      m_envVertices(),
      m_cubemapTexture(0),
      m_cubeVertices(),
      m_cubeTexCoords(),
      m_mallowTextures(),
      m_bounceRatio(1.0),
      m_hRotation(0.0),
      m_vRotation(0.0),
      m_zOffset(-4.0),
      m_lastMousePosition(),
      m_secondLastMousePosition(),
      m_kineticAnimation(0),
      m_spinMallow(false),
      m_mallowRotationMatrix()
{
    QPropertyAnimation* pressAnimation = new QPropertyAnimation(this, "bounceRatio", this);
    pressAnimation->setEndValue( (GLfloat) 0.5);
    pressAnimation->setDuration(250);
    pressAnimation->setEasingCurve(QEasingCurve::OutExpo);
    connect(this, SIGNAL(pressed(QPoint)), pressAnimation, SLOT(start()));
    connect(pressAnimation, SIGNAL(valueChanged(QVariant)), this, SLOT(updateGL()));

    QPropertyAnimation* releaseAnimation = new QPropertyAnimation(this, "bounceRatio", this);
    releaseAnimation->setEndValue( (GLfloat) 1.0);
    releaseAnimation->setDuration(2000);
    releaseAnimation->setEasingCurve(QEasingCurve::OutElastic);
    connect(this, SIGNAL(released()), releaseAnimation, SLOT(start()));
    connect(releaseAnimation, SIGNAL(valueChanged(QVariant)), this, SLOT(updateGL()));

    m_kineticAnimation = new QPropertyAnimation(this, "", this);
    m_kineticAnimation->setEndValue( QPointF(0,0) );
    m_kineticAnimation->setDuration(5000);
    m_kineticAnimation->setEasingCurve(QEasingCurve::OutExpo);
    connect(m_kineticAnimation, SIGNAL(valueChanged(QVariant)), this, SLOT(updateKineticScrolling(QVariant)));

}

GLSLTestWidget::~GLSLTestWidget()
{
    Q_FOREACH( GLuint tex, m_mallowTextures ) {
        deleteTexture(tex);
    }
}

void GLSLTestWidget::initializeGL()
{
    qglClearColor(Qt::gray);

    glEnable(GL_DEPTH_TEST);
    glDepthFunc(GL_LESS);

    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);

    initEnvironmentData();
    initCubeData();

    const bool useGLSL = QGLShader::hasOpenGLShaders(QGLShader::Fragment) &&
                         QGLShader::hasOpenGLShaders(QGLShader::Vertex) &&
                         QGLShaderProgram::hasOpenGLShaderPrograms();
    qDebug() << "Support for OpenGL Shaders:" <<  (useGLSL ? "yes" : "no");

    if (!useGLSL)
        return;

    m_cubeShaderProgram = new QGLShaderProgram(this);

    bool ok = false;
    ok = m_cubeShaderProgram->addShaderFromSourceFile(QGLShader::Vertex, CUBE_VERTEX_SHADER_PATH);
    if (!ok) {
        qDebug() << "Vertex shader compiling failed:" << m_cubeShaderProgram->log();
        return;
    }
    ok = m_cubeShaderProgram->addShaderFromSourceFile(QGLShader::Fragment, CUBE_FRAGMENT_SHADER_PATH);
    if (!ok) {
        qDebug() << "Fragment shader compiling failed:" << m_cubeShaderProgram->log();
        return;
    }

    ok = m_cubeShaderProgram->link();
    if (!ok) {
        qDebug() << "Shader program linking failed:" << m_cubeShaderProgram->log();
        return;
    }

    m_envShaderProgram = new QGLShaderProgram(this);

    ok = m_envShaderProgram->addShaderFromSourceFile(QGLShader::Vertex, ENV_VERTEX_SHADER_PATH);
    if (!ok) {
        qDebug() << "Vertex shader compiling failed:" << m_envShaderProgram->log();
        return;
    }
    ok = m_envShaderProgram->addShaderFromSourceFile(QGLShader::Fragment, ENV_FRAGMENT_SHADER_PATH);
    if (!ok) {
        qDebug() << "Fragment shader compiling failed:" << m_envShaderProgram->log();
        return;
    }

    ok = m_envShaderProgram->link();
    if (!ok) {
        qDebug() << "Shader program linking failed:" << m_envShaderProgram->log();
        return;
    }
}


void GLSLTestWidget::paintGL()
{
    const QVector3D cameraPos( qSin( deg2rad(m_hRotation) ) * qCos( deg2rad(m_vRotation) ) * m_zOffset,
                               qSin( deg2rad(m_vRotation) ) * m_zOffset,
                               qCos( deg2rad(m_hRotation) ) * qCos( deg2rad(m_vRotation) ) * m_zOffset) ;
    QMatrix4x4 cameraMatrix;
    cameraMatrix.lookAt( cameraPos, QVector3D(), QVector3D(0, 1, 0) );
#ifdef DEBUG_CAMERA
    qDebug() << "Camera position:" <<  cameraPos << "x-rotation=" << m_hRotation << "y-rotation=" << m_vRotation;
#endif

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    m_envShaderProgram->bind();

    m_envShaderProgram->enableAttributeArray("aVertex");
    m_envShaderProgram->setAttributeArray("aVertex", m_envVertices.constData());
    QMatrix4x4 projectionMatrix;
    projectionMatrix.frustum(-1.0f, 1.0f, -1.0f, 1.0f, 1.0f, 1000.0f);
    m_envShaderProgram->setUniformValue("projectionMatrix", projectionMatrix);
    m_envShaderProgram->setUniformValue("cameraMatrix", cameraMatrix);

    glBindTexture( GL_TEXTURE_CUBE_MAP, m_cubemapTexture );
    for (int face = 0; face < numCubeFaces; ++face) {
        glDrawArrays(GL_TRIANGLE_FAN, face * numCubemapFaceVertices, numCubemapFaceVertices);
    }

    m_cubeShaderProgram->bind();

    m_cubeShaderProgram->enableAttributeArray("aVertex");
    m_cubeShaderProgram->setAttributeArray("aVertex", m_cubeVertices.constData());
    m_cubeShaderProgram->enableAttributeArray("aTexCoord");
    m_cubeShaderProgram->setAttributeArray("aTexCoord", m_cubeTexCoords.constData());
    m_cubeShaderProgram->setAttributeValue("vBounceRatio", (GLfloat) bounceRatio());

    m_cubeShaderProgram->setUniformValue("projectionMatrix", projectionMatrix);
    m_cubeShaderProgram->setUniformValue("cameraMatrix", cameraMatrix);
    m_cubeShaderProgram->setUniformValue("rotationMatrix", m_mallowRotationMatrix);

    for (int face = 0; face < numCubeFaces; ++face) {
        glBindTexture( GL_TEXTURE_2D, m_mallowTextures.at( face % m_mallowTextures.size() ) );
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
                m_cubeTexCoords << QVector2D((j == 1 || j == 4 || j == 5) ? 0.0 : 1.0, (j == 3 || j == 4) ? 0.0 : 1.0);
            }
        }
    }

    m_mallowTextures << bindTexture( QImage( ":/images/mallow-happy" ), GL_TEXTURE_2D, GL_BGRA, QGLContext::LinearFilteringBindOption );
}

void GLSLTestWidget::initEnvironmentData()
{
    if ( !m_envVertices.empty() ) {
        // already initialized
        return;
    }

    static const int coords[numCubeFaces][numCubemapFaceVertices][3] = {
        { { +1, -1, -1 }, { -1, -1, -1 }, { -1, +1, -1 }, { +1, +1, -1 } },
        { { +1, +1, -1 }, { -1, +1, -1 }, { -1, +1, +1 }, { +1, +1, +1 } },
        { { +1, -1, +1 }, { +1, -1, -1 }, { +1, +1, -1 }, { +1, +1, +1 } },
        { { -1, -1, -1 }, { -1, -1, +1 }, { -1, +1, +1 }, { -1, +1, -1 } },
        { { +1, -1, +1 }, { -1, -1, +1 }, { -1, -1, -1 }, { +1, -1, -1 } },
        { { -1, -1, +1 }, { +1, -1, +1 }, { +1, +1, +1 }, { -1, +1, +1 } }
    };

    static const int mapFaces[numCubeFaces] = {
        GL_TEXTURE_CUBE_MAP_POSITIVE_Z,
        GL_TEXTURE_CUBE_MAP_NEGATIVE_Z,
        GL_TEXTURE_CUBE_MAP_POSITIVE_X,
        GL_TEXTURE_CUBE_MAP_NEGATIVE_X,
        GL_TEXTURE_CUBE_MAP_POSITIVE_Y,
        GL_TEXTURE_CUBE_MAP_NEGATIVE_Y
    };

    glGenTextures(1, &m_cubemapTexture);
    glBindTexture(GL_TEXTURE_CUBE_MAP, m_cubemapTexture);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

    for (int i = 0; i < numCubeFaces; ++i) {
        for (int j = 0; j < numCubemapFaceVertices; ++j) {
            m_envVertices << QVector3D(coords[i][j][0], coords[i][j][1], coords[i][j][2]) * cubeSideLength;
        }

        const QImage faceImage( QString(":/cubemaps/mountain/%1").arg(i+1) );
        glTexImage2D( mapFaces[i], 0, GL_BGRA, faceImage.width(), faceImage.height(), 0, GL_BGRA, GL_UNSIGNED_BYTE, faceImage.bits() );
    }
}

void GLSLTestWidget::mousePressEvent(QMouseEvent *e)
{
        m_secondLastMousePosition = QPoint();
        m_lastMousePosition = e->pos();

        m_kineticAnimation->stop();

        // TODO: add real hit detection
        const QRect mallowRect( rect().topLeft() + rect().center() * 0.5, rect().bottomRight() - rect().center() * 0.5);
        m_spinMallow = mallowRect.contains(e->pos());

        if ( m_spinMallow ) {
            emit pressed(e->pos());
        }
}

void GLSLTestWidget::mouseReleaseEvent(QMouseEvent *e)
{
    if ( !m_secondLastMousePosition.isNull() ) {
        const QPointF delta = m_lastMousePosition - m_secondLastMousePosition;

        if ( delta.manhattanLength() > 5.0 ) {
            m_kineticAnimation->setStartValue( QPointF(delta.x() * xPanningMultiplier, delta.y() * yPanningMultiplier) );
            m_kineticAnimation->start();
        }        
    }

    if ( m_spinMallow ) {
        emit released();
    }
}

void GLSLTestWidget::mouseMoveEvent(QMouseEvent *e)
{
    const QPoint delta = e->pos() - m_lastMousePosition;
    if ( m_spinMallow ) {
        m_mallowRotationMatrix.rotate( delta.manhattanLength(), -delta.y(), -delta.x());
    } else {
        m_hRotation += delta.x() * xPanningMultiplier;
        m_vRotation = qBound(-89.0f, m_vRotation + delta.y() * yPanningMultiplier, 89.0f);
    }

    m_secondLastMousePosition = m_lastMousePosition;
    m_lastMousePosition = e->pos();
    updateGL();
}

void GLSLTestWidget::wheelEvent(QWheelEvent *e)
{
    m_zOffset = qBound(cubeSideLength * -1.0f, m_zOffset + (( e->delta() > 0 ) ? 0.1f : -0.1f), -3.0f);
    updateGL();
}

void GLSLTestWidget::updateKineticScrolling(const QVariant &value)
{
    if ( m_spinMallow ) {
        m_mallowRotationMatrix.rotate( value.toPointF().manhattanLength(), -value.toPointF().y(), -value.toPointF().x());
    } else {
        m_hRotation += value.toPointF().x();
        m_vRotation = qBound(-89.0f, m_vRotation + value.toPointF().y(), 89.0f);
        updateGL();
    }
}


