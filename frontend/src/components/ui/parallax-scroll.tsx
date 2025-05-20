import { useScroll, useTransform } from "motion/react";
import { useRef, ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "../../utils/util";

interface ParallaxScrollProps {
  children: ReactNode[];
  className?: string;
}

export const ParallaxScroll = ({
  children,
  className,
}: ParallaxScrollProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: gridRef,
    offset: ["start start", "end start"],
  });

  // motion transforms for three columns
  const translateFirst = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const translateSecond = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const translateThird = useTransform(scrollYProgress, [0, 1], [0, -200]);

  // divide children into three roughly equal parts
  const total = children.length;
  const third = Math.ceil(total / 3);
  const firstPart = children.slice(0, third);
  const secondPart = children.slice(third, 2 * third);
  const thirdPart = children.slice(2 * third);

  return (
    <div
      className={cn("min-h-[40rem] overflow-visible  w-full", className)}
      ref={gridRef}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto gap-10 pb-20 px-10">
        {/* Column 1 */}
        <div className="grid gap-10">
          {firstPart.map((child, idx) => (
            <motion.div style={{ y: translateFirst }} key={"col1-" + idx}>
              {child}
            </motion.div>
          ))}
        </div>

        {/* Column 2 */}
        <div className="grid gap-10">
          {secondPart.map((child, idx) => (
            <motion.div style={{ y: translateSecond }} key={"col2-" + idx}>
              {child}
            </motion.div>
          ))}
        </div>

        {/* Column 3 */}
        <div className="grid gap-10">
          {thirdPart.map((child, idx) => (
            <motion.div style={{ y: translateThird }} key={"col3-" + idx}>
              {child}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
