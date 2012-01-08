#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QPoint>
#include <QVector>
#include <QPair>
#include <QVector2D>
#include <QVector3D>

class QGLShaderProgram;

class GLSLTestWidget : public QGLWidget
{
    Q_OBJECT
    Q_PROPERTY( qreal bounceRatio READ bounceRatio WRITE setBounceRatio )

public:
    GLSLTestWidget( const QGLFormat& glFormat = QGLFormat::defaultFormat(), QWidget *parent = 0);
    ~GLSLTestWidget();

    qreal bounceRatio() const { return m_bounceRatio; }
    void setBounceRatio( qreal br ) { m_bounceRatio = br; }

signals:
    void pressed( const QPoint& );
    void released();

protected:
    void initializeGL();
    void paintGL();
    void resizeGL(int w, int h);

    void mousePressEvent(QMouseEvent *);
    void mouseReleaseEvent(QMouseEvent *);
    void mouseMoveEvent(QMouseEvent *);
    void wheelEvent(QWheelEvent *);
private:
    void initCubeData();
    void initEnvironmentData();

    QGLShaderProgram*  m_cubeShaderProgram;
    QGLShaderProgram*  m_envShaderProgram;

    QVector<QVector3D> m_envVertices;
    GLuint             m_cubemapTexture;

    QVector<QVector3D> m_cubeVertices;
    QVector<QVector2D> m_cubeTexCoords;
    QVector<GLuint>    m_mallowTextures;

    qreal m_bounceRatio;

    int m_hRotation;
    int m_vRotation;
    qreal m_zOffset;

    QPoint m_lastMousePosition;
};

#endif // WIDGET_H
