const tests = [
  "256779460870",
  "+256779460870",
  "0755341098",
  "0742059348",
  "1052103284738", // Should not match
  "142001301174", // Should not match
  "140974823903", // Should not match
  "38563292600"  // Should not match
];

const strictPhoneRegex = /(?:\+|00)\d{8,15}\b|\b(?:256|254|255|234|27|44|1)[73489]\d{8}\b|\b0[73489]\d{8}\b/g;

tests.forEach(t => {
  const match = t.match(strictPhoneRegex);
  console.log(`${t} -> ${match}`);
});
