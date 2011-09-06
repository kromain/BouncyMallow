#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QPoint>

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
    GLuint cube();

    QGLShaderProgram* m_shaderProgram;

    GLuint m_mallowTexture;
    GLuint m_object;

    qreal m_bounceRatio;

    qreal m_xOffset;
    qreal m_yOffset;
    qreal m_zOffset;

    QPoint m_lastMousePosition;
};

#endif // WIDGET_H
