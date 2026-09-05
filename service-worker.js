const CACHE_NAME = "smart-board-v4";

const APP_SHELL = [
  "/smart-work-board/",
  "/smart-work-board/index.html",
  "/smart-work-board/manifest.json",
  "/smart-work-board/icon-192.png",
  "/smart-work-board/icon-512.png"
];


/* ========================================================
   설치
======================================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(APP_SHELL);
      })
  );

  /*
     새 Service Worker가 즉시 대기 상태를 벗어나도록 함
  */
  self.skipWaiting();
});


/* ========================================================
   활성화
   - 이전 버전 캐시 자동 삭제
======================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()
      .then(keys => {

        return Promise.all(

          keys.map(key => {

            if (key !== CACHE_NAME) {

              return caches.delete(key);
            }

          })

        );

      })

  );

  /*
     현재 열려 있는 페이지에도
     새 Service Worker를 바로 적용
  */
  self.clients.claim();
});


/* ========================================================
   네트워크 / 캐시 처리
======================================================== */

self.addEventListener("fetch", event => {

  const request = event.request;


  /*
     GET 요청만 처리
  */
  if (request.method !== "GET") {
    return;
  }


  const url =
    new URL(request.url);


  /*
     Supabase, jsDelivr 등 외부 서버 요청은
     Service Worker가 건드리지 않음
  */
  if (url.origin !== self.location.origin) {
    return;
  }


  /*
     HTML 페이지는 항상 인터넷의 최신 버전을 먼저 확인
  */
  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request)

        .then(response => {

          /*
             최신 HTML을 캐시에도 갱신
          */
          const responseCopy =
            response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {

              cache.put(
                request,
                responseCopy
              );

            });

          return response;
        })

        .catch(async () => {

          /*
             인터넷이 안 될 때만
             저장된 HTML 사용
          */
          const cachedPage =
            await caches.match(
              "/smart-work-board/index.html"
            );

          if (cachedPage) {
            return cachedPage;
          }

          return caches.match(
            "/smart-work-board/"
          );
        })

    );

    return;
  }


  /*
     이미지, manifest 등도
     온라인에서는 최신 파일 우선
  */
  event.respondWith(

    fetch(request)

      .then(response => {

        if (
          response &&
          response.status === 200
        ) {

          const responseCopy =
            response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {

              cache.put(
                request,
                responseCopy
              );

            });
        }

        return response;
      })

      .catch(() => {

        return caches.match(request);

      })

  );

});
