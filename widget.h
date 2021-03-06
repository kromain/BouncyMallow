#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QPoint>
#include <QVector>
#include <QPair>
#include <QVector2D>
#include <QVector3D>
#include <QMatrix4x4>

class QGLShaderProgram;
class QVariantAnimation;

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

private slots:
    void updateKineticScrolling( const QVariant& value );

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

    qreal m_hRotation;
    qreal m_vRotation;
    qreal m_zOffset;

    QPoint m_lastMousePosition;
    QPoint m_secondLastMousePosition;

    QVariantAnimation* m_kineticAnimation;

    bool  m_spinMallow;
    QMatrix4x4 m_mallowRotationMatrix;
};

#endif // WIDGET_H
