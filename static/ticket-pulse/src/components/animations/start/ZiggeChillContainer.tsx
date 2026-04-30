import ZiggeChill, { ZiggeChillProps } from "./ZiggeChill";
import "./zigge-chill-container.scss";

interface ZiggeChillContainerProps extends ZiggeChillProps {
  children?: React.ReactNode;
}

const ZiggeChillContainer = (props: ZiggeChillContainerProps) => {
  return (
    <div
      className={`zigge-chill-container ${props.expandSun ? "is-expanded" : ""}`}
    >
      <ZiggeChill {...props} />
      {props.children}
    </div>
  );
};

export default ZiggeChillContainer;
