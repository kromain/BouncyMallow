
// We create an HTMLTile shim as an canvas element providing the API of HTMLTile
// The shim's imageData contains a textual representation of the tile state
function registerHTMLTileShimIfNeeded() {
  if (typeof(HTMLTile) !== "object") {

    HTMLTile = function(width, height) {
      // Private members
      var m_isValid = true;
      var m_isPaused = false;
      var m_src = "";

      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext("2d");
      var imageDataCache = ctx.getImageData(0,0, canvas.width, canvas.height);

      var eventsList = new Array();

      // Public properties 
      Object.defineProperties(this, {
        "width" : {
          get: function() {
            return m_isValid ? canvas.width : 0;
          }
        },
        "height" : {
          get: function() {
            return m_isValid ? canvas.height : 0;
          }
        },
        "isValid" : {
          get: function() {
            return m_isValid;
          }
        },
        "imageData" : {
          get: function() {
            return imageDataCache;
          }
        },
        "src" : {
          get: function() {
            return m_isValid ? m_src : "";
          },
          set: function(val) {
            if(m_isValid) {
              m_src = val;
              updateCanvas();
              if (this.onload)
                this.onload();
              if (this.onupdate)
                this.onupdate();
            }
          }
        },
      });

      var that = this;
      // Private methods
      function updateCanvas() {
        ctx.fillStyle = m_isPaused ? "gray" : "royalblue";
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.strokeStyle = m_isPaused ? "white" : "midnightblue";
        ctx.lineWidth = 2;
        ctx.strokeRect(1,1,canvas.width-2, canvas.height-2);
        
        ctx.fillStyle = m_isPaused ? "white" : "midnightblue";
        ctx.textBaseline = "top";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("URL:", 10, 10);
        ctx.fillText("Events:", 10, 40);
        ctx.font = "12px sans-serif";
        ctx.fillText(m_src, 10, 24);

        var textY = 54;
        for (var i = 0; i < eventsList.length; i++) {
          ctx.fillText(eventsList[i], 20, textY);
          textY += 12;
          if (textY >= (canvas.height-ctx.lineWidth))
            eventsList.shift();
        };

        imageDataCache = ctx.getImageData(0,0, canvas.width, canvas.height);

        if (that.onupdate)
          that.onupdate();
      };

      // Public methods
      this.destroy = function() {
        if (m_isValid) {
          m_isValid = false;
          // TODO clean up
        }
      };

      this.pause = function() {
        if (m_isValid && !m_isPaused) {
          m_isPaused = true;
          updateCanvas();
        }
      }

      this.resume = function() {
        if (m_isValid && m_isPaused) {
          m_isPaused = false;
          updateCanvas();
        }
      }

      this.eval = function() {
        if (m_isValid) {
          // TODO
        }
      }

      this.sendEvent = function(event) {
        if (m_isValid) {
          eventsList.push(event);
          updateCanvas();
        }
      }
    }

    // Static enum values
    HTMLTile.FocusIn = "FocusIn";
    HTMLTile.FocusOut = "FocusOut";
    HTMLTile.ButtonPress = "ButtonPress";
    HTMLTile.ButtonRelease = "ButtonRelease";
  }
}
