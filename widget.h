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
private:
    void initCubeData();

    QGLShaderProgram* m_shaderProgram;

    QVector<QVector3D> m_cubeVertices;
    QVector<QVector2D> m_cubeTexCoords;

    GLuint m_mallowTexture;

    qreal m_bounceRatio;

    qreal m_xOffset;
    qreal m_yOffset;
    qreal m_zOffset;

    QPoint m_lastMousePosition;
};

#endif // WIDGET_H
