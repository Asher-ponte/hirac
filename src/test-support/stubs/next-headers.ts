type TestGlobals = {__testCookies?: Record<string, string>};

export async function cookies() {
  const jar = (globalThis as TestGlobals).__testCookies ?? {};
  return {
    get(name: string) {
      return name in jar ? {name, value: jar[name]} : undefined;
    },
  };
}
