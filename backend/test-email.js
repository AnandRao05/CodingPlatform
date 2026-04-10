const { Resend } = require('resend');

const resendApiKey = 're_RC2SsdP9_NuXQKWEQhLKtcbwWwK7E7VsJ';
const resend = new Resend(resendApiKey);

async function test() {
  const { data, error } = await resend.emails.send({
    from: 'RGUKT Coding Platform <onboarding@resend.dev>',
    to: 'test@example.com',
    subject: 'hello',
    html: '<p>test</p>'
  });
  console.log('Result:', { data, error });
}
test();
