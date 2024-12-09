import {Html, Button, Heading} from "@react-email/components";

export default function TestEmail(props) {
  const { url } = props;

  return (
    <Html lang="en">
      <Heading as="h1" style={{ fontFamily: 'sans-serif' }}>
        Hello, Universe!
      </Heading>
      <Button
        href="https://spacejelly.dev"
        style={{ fontFamily: 'sans-serif' , background: "blueviolet", color: "white", padding: "12px 20px" }}
      >
        Visit Space Jelly
      </Button>
    </Html>
  );
}