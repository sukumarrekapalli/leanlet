// Thin static-asset adapter used by managed Sites hosting.
// GitHub Pages and other static hosts deploy dist/client directly.
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
