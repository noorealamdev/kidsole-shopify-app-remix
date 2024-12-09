import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export default function ReviewRequest(props) {
  const { reviewLink, bodyText, shopName } = props;
  return (
    <Html lang="en">
      <Body style={main}>
        <Container style={container}>
          <Text
            style={paragraph}
            dangerouslySetInnerHTML={{__html: bodyText}}
          >
          </Text>
          <Img
            src="https://i.imgur.com/PUyo7wl.png"
            width="270"
            height="100"
            alt="Koala"
            style={logo}
          />
          <Section style={btnContainer}>
            <Button style={button} href={reviewLink}>
              Write a review
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#ffffff",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
};

const logo = {
  margin: "0 auto",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const btnContainer = {
  textAlign: "center",
};

const button = {
  backgroundColor: "#52b1d9",
  borderRadius: "3px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center",
  display: "block",
  padding: "12px",
};

const hr = {
  borderColor: "#cccccc",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
};