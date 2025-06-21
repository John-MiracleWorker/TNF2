import { MessageSquareHeart, BookOpen, LineChart, Users, Target, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    title: 'Real Conversation',
    description: 'Have meaningful conversations about faith, life challenges, and spiritual growth with an AI coach that understands Biblical principles.',
    icon: MessageSquareHeart,
  },
  {
    title: 'Scripture-First',
    description: 'Every piece of guidance is rooted in Scripture, providing Biblical wisdom for your daily decisions and spiritual questions.',
    icon: BookOpen,
  },
  {
    title: 'Growth Tracking',
    description: 'Track your spiritual journey, set faith goals, and monitor your progress as you grow in knowledge and application of God\'s Word.',
    icon: LineChart,
  },
  {
    title: 'Faith Communities',
    description: 'Connect with other believers in virtual small groups to pray together, share scripture insights, and encourage one another.',
    icon: Users,
  },
  {
    title: 'Group Challenges',
    description: 'Participate in community challenges like 30-day prayer streaks or scripture memory marathons to grow together spiritually.',
    icon: Target,
  },
  {
    title: 'Synchronized Reading',
    description: 'Join group Bible reading plans where everyone follows the same schedule, with shared reflections and discussion.',
    icon: Calendar,
  }
];

const featureVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 * i,
      duration: 0.5,
    },
  }),
};

const Features = () => {
  return (
    <section id="features" className="py-20 bg-card text-card-foreground">
      <div className="container-custom mx-auto">
        <div className="text-center mb-16">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Faith-Centered Features
          </motion.h2>
          <motion.p 
            className="section-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            TrueNorth provides Biblical guidance through these powerful features
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={featureVariants}
            >
              <Card className="bg-background/5 border-secondary/20 backdrop-blur-sm h-full">
                <CardHeader>
                  <div className="bg-secondary/20 p-3 rounded-full w-fit mb-4">
                    <feature.icon className="h-8 w-8 text-secondary" />
                  </div>
                  <CardTitle className="text-secondary text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-card-foreground/80 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;