if (!customElements.get('video-external')) {
  customElements.define(
    'video-external',
    class VideoExternal extends HTMLElement {
      constructor() {
        super();
        this.id = this.getAttribute('data-media-id');
        this.host = this.getAttribute('data-host');
        this.title = this.getAttribute('data-title');
        this.loop = this.getAttribute('data-loop') === 'true';
        this.controls = this.getAttribute('data-controls');
        this.lazyload = this.getAttribute('data-lazyload') === 'true';
        this.externalListened = false;
        this.ytIframeId = 0;
        this.vimeoIframeId = 0;
      }
      connectedCallback() {
        this.externalLoad(this.host, this.id, this.loop, this.title, this.controls, this.lazyload);
      }
      play(el) {
        let video = el.getElementsByClassName('video')[0];
        if (!video && el.closest('.contain-video')) {
          video = el.closest('.contain-video').getElementsByClassName('video')[0];
        }
        if (video) {
          if (video.tagName == 'IFRAME') {
            this.externalPostCommand(video, 'play');
          } else if (video.tagName == 'VIDEO') {
            video.play();
          }
        }
      }

      pause(el) {
        let video = el.getElementsByClassName('video')[0];
        if (!video && el.closest('.contain-video')) {
          video = el.closest('.contain-video').getElementsByClassName('video')[0];
        }
        if (video) {
          if (video.tagName == 'IFRAME') {
            this.externalPostCommand(video, 'pause');
          } else if (video.tagName == 'VIDEO') {
            video.pause();
          }
        }
      }

      externalListen() {
        if (!this.externalListened) {
          window.addEventListener('message', (event) => {
            var iframes = document.getElementsByTagName('IFRAME');

            for (let i = 0, iframe, win, message; i < iframes.length; i++) {
              iframe = iframes[i];

              if (iframe.getAttribute('data-video-loop') !== 'true') continue;

              // Cross-browser way to get iframe's window object
              win = iframe.contentWindow || iframe.contentDocument.defaultView;

              if (win === event.source) {
                if (event.origin == 'https://www.youtube.com') {
                  message = JSON.parse(event.data);
                  if (message.info && message.info.playerState == 0) {
                    this.play(iframe.parentNode);
                  }
                }

                if (event.origin == 'https://player.vimeo.com') {
                  message = JSON.parse(event.data);
                  if (message.event == 'finish') {
                    this.play(iframe.parentNode);
                  }
                }
              }
            }
          });

          this.externalListened = true;
        }
      }

      externalLoad(host, id, loop, title, controls = 1, lazyload = true, classes = '') {
        let src = '';
        let pointerEvent = '';
        let lazyAttribute = 'eager';
        let fetchpriorityAttribute = 'high';
        if (host == 'youtube') {
          src = `https://www.youtube.com/embed/${id}?mute=1&playlist=${id}&autoplay=1&loop=1&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&controls=${controls}&showinfo=${controls}`;
        } else {
          src = `https://player.vimeo.com/video/${id}?muted=1&autoplay=1&playsinline=1&api=1&controls=${controls}&background=1`;
        }

        if (controls == 0) {
          pointerEvent = 'pointer-events-none';
        }
        if (lazyload) {
          lazyAttribute = 'lazy';
          fetchpriorityAttribute = 'medium';
        }

        requestAnimationFrame(() => {
          const videoContainer = this.closest('.external-video');
          videoContainer.innerHTML = `<iframe loading="${lazyAttribute}" fetchpriority="${fetchpriorityAttribute}" data-video-loop="${loop}" class=" ${classes} iframe-video absolute w-full h-full video top-1/2 -translate-y-1/2 ${pointerEvent}"
              frameborder="0" host="${host}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen playsinline
              src="${src}" title="${title}"></iframe>`;

          videoContainer.querySelector('.iframe-video').addEventListener('load', () => {
            setTimeout(() => {
              this.play(videoContainer);

              if (host == 'youtube') {
                this.ytIframeId++;
                videoContainer.querySelector('.iframe-video').contentWindow.postMessage(
                  JSON.stringify({
                    event: 'listening',
                    id: this.ytIframeId,
                    channel: 'widget',
                  }),
                  '*'
                );
              } else {
                this.vimeoIframeId++;
                videoContainer.querySelector('.iframe-video').contentWindow.postMessage(
                  JSON.stringify({
                    method: 'addEventListener',
                    value: 'finish',
                  }),
                  '*'
                );
              }
            }, 100);
          });
        });

        this.externalListen();
      }
      externalPostCommand(iframe, cmd) {
        const host = iframe.getAttribute('host');
        const command =
          host == 'youtube'
            ? {
                event: 'command',
                func: cmd + 'Video',
              }
            : {
                method: cmd,
                value: 'true',
              };

        iframe.contentWindow.postMessage(JSON.stringify(command), '*');
      }
    }
  );
}
