export interface OtpEmailTemplateInput {
  otp: string;
  expiresInMinutes: number;
}

export const createOtpEmailTemplate = ({
  otp,
  expiresInMinutes,
}: OtpEmailTemplateInput): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Cheepfud Verification Code</title>
      </head>
      <body>
        <h2>Verify your Cheepfud account</h2>

        <p>Your verification code is:</p>

        <h1>${otp}</h1>

        <p>
          This code expires in ${expiresInMinutes} minutes.
        </p>

        <p>
          If you did not request this code, you can safely ignore this email.
        </p>

        <p>— The Cheepfud Team</p>
      </body>
    </html>
  `;
};
